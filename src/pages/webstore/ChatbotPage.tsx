import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { useSettings } from '../../hooks/useSettings';
import { fetchProducts } from '../../lib/api/products';
import { fetchSettings } from '../../lib/api/settings';
import { fetchCustomerByPhone, createCustomer } from '../../lib/api/customers';
import { upsertOrder, insertOrderItems } from '../../lib/api/orders';
import { DbError } from '../../lib/api/errors';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  isFunctionCall?: boolean;
}

export default function ChatbotPage() {
  const navigate = useNavigate();
  const { storeName } = useSettings();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Hi! I am your AI assistant. I can help you check the menu or place an order. What would you like to have today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Track raw Gemini history for generateContent
  const [history, setHistory] = useState<any[]>([
    { role: 'user', parts: [{ text: "Hello" }] },
    { role: 'model', parts: [{ text: `Hi! I am your AI assistant for ${storeName || 'our restaurant'}. I can help you check the menu or place an order. What would you like to have today?` }] }
  ]);
  
  // Initialize AI lazily
  const getAI = () => {
    const runtimeEnv = typeof window !== 'undefined' ? ((window as any).__ENV__ || {}) : {};
    const key = runtimeEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    if (!key) {
      console.warn("GEMINI_API_KEY is not set. AI features may not work.");
    }
    return new GoogleGenAI({ apiKey: key });
  };

  useEffect(() => {
    fetchProducts(true)
      .then(data => { if (data) setProducts(data as Product[]); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const placeOrderFunc: FunctionDeclaration = {
    name: "placeOrder",
    description: "Submit a food order for the customer. ONLY call this when the customer has clearly confirmed they want to order and you have gathered their name, phone number, and items.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        customerName: { type: Type.STRING, description: "The customer's name" },
        customerPhone: { type: Type.STRING, description: "The customer's phone number" },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              productId: { type: Type.STRING, description: "The ID of the product from the menu" },
              quantity: { type: Type.NUMBER, description: "Quantity of this item" }
            }
          }
        }
      },
      required: ["customerName", "customerPhone", "items"]
    }
  };

  const executePlaceOrder = async (args: any) => {
    try {
      if (!args.items || args.items.length === 0) return { error: "No items provided" };

      const orderId = crypto.randomUUID();
      
      // Calculate subtotals
      let subtotal = 0;
      for (const item of args.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) subtotal += (prod.price * item.quantity);
      }
      
      const settings = await fetchSettings();
      const taxRate = settings?.tax_rate || 0;
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      // Ensure customer exists or create them
      let assignedCustomerId = null;
      if (args.customerPhone) {
        const existC = await fetchCustomerByPhone(args.customerPhone);
        if (existC) assignedCustomerId = existC.id;
        else {
          const newC = await createCustomer({ name: args.customerName, phone: args.customerPhone });
          if (newC) assignedCustomerId = newC.id;
        }
      }

      await upsertOrder({
        id: orderId,
        subtotal, tax, total,
        payment_method: 'CASH',
        timestamp: new Date().toISOString(),
        customer_name: args.customerName,
        customer_id: assignedCustomerId,
        status: 'pending'
      });

      const oItems = args.items.map((i: any) => ({
        order_id: orderId,
        product_id: i.productId,
        quantity: i.quantity,
        note: 'AI Order generated via WhatsApp'
      }));

      await insertOrderItems(oItems);

      return { success: true, orderId: orderId, totalCost: total };
    } catch (e: any) {
      console.error(e);
      return { error: e instanceof DbError ? e.userMessage : e.message };
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userText }]);
    
    // Construct system instructions with live menu
    const menuContext = products.map(p => `- ${p.name} (ID: ${p.id}, Price: $${p.price.toFixed(2)})`).join('\n');
    let systemInstruction = `You are a helpful and friendly WhatsApp ordering assistant for ${storeName || 'our restaurant'}. 
Your job is to help customers place orders. 
Here is our current menu:
${menuContext}

Rules:
1. Always be polite. Keep responses short and conversational, like on WhatsApp.
2. Ask for the customer's name and phone number before confirming the order.
3. Use the placeOrder tool when all details are gathered.
4. Don't invent products that aren't on the list.
5. If someone asks for a menu, show them a nice summary.`;

    const newHistory = [...history, { role: 'user', parts: [{ text: userText }] }];
    setHistory(newHistory);
    setIsTyping(true);

    try {
      let callAI = async (currentHistory: any[]) => {
        const ai = getAI();
        return await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview', // Pro for function calling reliability
          contents: currentHistory,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: [placeOrderFunc] }],
            temperature: 0.2
          }
        });
      };

      let response = await callAI(newHistory);
      let updatedHistory = [...newHistory];

      // Check if function call was made
      if (response.functionCalls && response.functionCalls.length > 0) {
        const fc = response.functionCalls[0];
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: `[Processing order...]`, isFunctionCall: true }]);
        
        let functionResult;
        if (fc.name === 'placeOrder') {
          functionResult = await executePlaceOrder(fc.args);
        }

        // Add the function call + response to history for the next turn
        updatedHistory.push({ role: 'model', parts: [{ functionCall: fc }] });
        updatedHistory.push({ role: 'user', parts: [{ functionResponse: { name: fc.name, response: functionResult } }] });

        // Call AI again to summarize the function result
        response = await callAI(updatedHistory);
      }

      const replyText = response.text || "I'm sorry, I encountered an issue Processing that.";
      updatedHistory.push({ role: 'model', parts: [{ text: replyText }] });

      setHistory(updatedHistory);
      setMessages(prev => [...prev.filter(m => !m.isFunctionCall), { id: Date.now().toString(), role: 'model', content: replyText }]);

    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "Sorry, I am having trouble connecting right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ece5dd] sm:bg-theme-bg flex flex-col font-sans relative">
      {/* Mobile-style WhatsApp Header */}
      <header className="sticky top-0 z-40 bg-[#075e54] text-white shadow-md">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/store')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0 border border-white/30 backdrop-blur-sm">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-white leading-tight">Order Assistant</h1>
            <p className="text-[11px] text-white/70 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 flex flex-col gap-4 pb-24 overflow-y-auto" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20z' fill='%23000000' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E")` 
      }}>
        <div className="bg-[#e1f3fb] text-[#2c3e50] text-[11px] py-1 px-3 rounded-lg mx-auto text-center shadow-sm max-w-[80%] uppercase tracking-wider mb-2">
          Messages are end-to-end simulated ❤️
        </div>
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm relative ${
              msg.role === 'user' 
                ? 'bg-[#dcf8c6] text-[#2c3e50] rounded-tr-sm' 
                : 'bg-white text-[#2c3e50] rounded-tl-sm'
            }`}>
              {msg.isFunctionCall ? (
                <div className="flex items-center gap-2 text-[#075e54] font-medium text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Placing order on server...
                </div>
              ) : (
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
              {/* Fake timestamp indicator */}
              <div className="text-[10px] text-black/40 text-right mt-1 w-full relative">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-theme-accent/50 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-theme-accent/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-theme-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </main>

      {/* Input Area */}
      <footer className="fixed bottom-0 z-50 w-full bg-[#f0f0f0] border-t border-black/10">
        <div className="max-w-md mx-auto p-3 flex items-center gap-2">
          <div className="flex-1 bg-white rounded-full flex items-center px-4 box-border shadow-sm overflow-hidden border border-black/5">
            <Sparkles className="w-4 h-4 text-theme-accent shrink-0" />
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Message AI Assistant..."
              className="w-full py-3 px-3 text-sm focus:outline-none bg-transparent text-[#2c3e50]"
              disabled={isTyping}
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all ${
              input.trim() && !isTyping ? 'bg-[#00a884] text-white shadow-md cursor-pointer hover:scale-105 active:scale-95' : 'bg-[#e5e5e5] text-black/30 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </div>
      </footer>
    </div>
  );
}
