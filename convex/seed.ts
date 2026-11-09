import { mutation } from './_generated/server'

export const seedMenus = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('menus').first()
    if (existing) return 'Menus already seeded'

    const items = [
      {
        title: 'Chicken Satay',
        category: 'Starters',
        prices: { takeaway: 16.5, dineIn: 17.5, delivery: 19.0 },
        heat: 'Mild',
        description: 'Served with peanut dipping sauce and cucumber relish',
        sortOrder: 1,
      },
      {
        title: 'Crispy Spring Rolls',
        category: 'Starters',
        prices: { takeaway: 14.0, dineIn: 15.0, delivery: 16.5 },
        heat: 'Mild',
        description:
          'Crispy on the outside, soft on the inside. Served with sweet chili sauce',
        sortOrder: 2,
      },
      {
        title: 'Thai Fish Cakes',
        category: 'Starters',
        prices: { takeaway: 16.0, dineIn: 17.0, delivery: 18.5 },
        heat: 'Medium',
        description:
          'Golden pan-fried fish cakes with red curry, kaffir lime leaves, and long beans. Served with sweet cucumber relish',
        sortOrder: 3,
      },
      {
        title: 'Tod Mun',
        category: 'Starters',
        prices: { takeaway: 16.0, dineIn: 17.0, delivery: 18.5 },
        heat: 'Medium',
        description:
          'Traditional Thai fish patties with fragrant herbs, crispy on the outside and tender inside. Paired with Thai chili dipping sauce',
        sortOrder: 4,
      },
      {
        title: 'Moo Ping',
        category: 'Starters',
        prices: { takeaway: 15.0, dineIn: 16.0, delivery: 17.5 },
        heat: 'Mild',
        description:
          'Grilled pork skewers marinated in coconut milk, garlic, and palm sugar. Served with sticky rice and jaew dipping sauce',
        sortOrder: 5,
      },
      {
        title: 'Som Tam',
        category: 'Salads',
        prices: { takeaway: 17.5, dineIn: 18.5, delivery: 20.0 },
        heat: 'Hot',
        description:
          'Green papaya salad pounded fresh with lime, chili, fish sauce, palm sugar, peanuts, and dried shrimp. A classic Thai street-food favourite',
        sortOrder: 6,
      },
      {
        title: 'Larb Gai',
        category: 'Salads',
        prices: { takeaway: 18.0, dineIn: 19.0, delivery: 21.0 },
        heat: 'Hot',
        description:
          'Minced chicken salad with roasted chili, lime juice, fresh mint, and shallots. Light, zesty, and full of bold northern Thai flavours',
        sortOrder: 7,
      },
      {
        title: 'Yum Woon Sen',
        category: 'Salads',
        prices: { takeaway: 19.0, dineIn: 20.0, delivery: 22.0 },
        heat: 'Hot',
        description:
          'Glass noodle salad tossed with prawns, minced pork, cherry tomatoes, and shallots in a tangy lime and chili dressing',
        sortOrder: 8,
      },
      {
        title: 'Pad Thai Prawns',
        category: 'Noodles',
        prices: { takeaway: 24.0, dineIn: 25.5, delivery: 28.0 },
        heat: 'Medium',
        description:
          'Wok-tossed rice noodles with tiger prawns, egg, bean sprouts, and crushed peanuts in tamarind sauce. Served with lime wedge',
        sortOrder: 9,
      },
      {
        title: 'Pad See Ew',
        category: 'Noodles',
        prices: { takeaway: 22.0, dineIn: 23.5, delivery: 25.5 },
        heat: 'Mild',
        description:
          'Flat rice noodles stir-fried with Chinese broccoli, egg, and dark soy sauce. A comforting Thai-Chinese classic with smoky wok hei',
        sortOrder: 10,
      },
      {
        title: 'Pad Kee Mao',
        category: 'Noodles',
        prices: { takeaway: 23.5, dineIn: 25.0, delivery: 27.0 },
        heat: 'Hot',
        description:
          'Wide rice noodles wok-fried with fresh holy basil, chili, garlic, and your choice of protein. The legendary drunken noodle',
        sortOrder: 11,
      },
      {
        title: 'Boat Noodles',
        category: 'Noodles',
        prices: { takeaway: 22.0, dineIn: 23.5, delivery: 25.5 },
        heat: 'Hot',
        description:
          "Rich, dark pork-and-beef broth with thin rice noodles, pork balls, and crispy pork skin. Inspired by Bangkok's famous canal-side vendors",
        sortOrder: 12,
      },
      {
        title: 'Khao Soi',
        category: 'Noodles',
        prices: { takeaway: 24.5, dineIn: 26.0, delivery: 28.0 },
        heat: 'Medium',
        description:
          'Northern Thai coconut curry noodle soup with egg noodles, tender chicken, pickled mustard greens, and crispy noodle topping',
        sortOrder: 13,
      },
      {
        title: 'Green Curry Chicken',
        category: 'Curries',
        prices: { takeaway: 25.5, dineIn: 27.0, delivery: 29.5 },
        heat: 'Medium',
        description:
          'Tender chicken simmered in fresh green curry paste with coconut milk, Thai eggplant, bamboo shoots, and sweet basil leaves',
        sortOrder: 14,
      },
      {
        title: 'Panang Curry',
        category: 'Curries',
        prices: { takeaway: 26.0, dineIn: 27.5, delivery: 30.0 },
        heat: 'Medium',
        description:
          'Thick, creamy panang curry with sliced chicken, kaffir lime leaves, and a hint of peanuts. Richer and more concentrated than other Thai curries',
        sortOrder: 15,
      },
      {
        title: 'Massaman Beef',
        category: 'Curries',
        prices: { takeaway: 27.0, dineIn: 28.5, delivery: 31.0 },
        heat: 'Mild',
        description:
          'Slow-braised beef in a mild Massaman curry with potatoes, roasted peanuts, onions, and warm spices like cardamom and cinnamon',
        sortOrder: 16,
      },
      {
        title: 'Red Curry Duck',
        category: 'Curries',
        prices: { takeaway: 28.0, dineIn: 29.5, delivery: 32.0 },
        heat: 'Medium',
        description:
          'Pan-seared duck in a vibrant red curry with coconut milk, cherry tomatoes, pineapple, and Thai basil. A harmonious balance of sweet and savoury',
        sortOrder: 17,
      },
      {
        title: 'Holy Basil Stir-fry + Egg',
        category: 'Stir-fry',
        prices: { takeaway: 22.5, dineIn: 24.0, delivery: 26.0 },
        heat: 'Hot',
        description:
          "Wok-fired minced chicken with fresh holy basil, garlic, and bird's eye chili, topped with a crispy fried egg. A Thai comfort food staple",
        sortOrder: 18,
      },
      {
        title: 'Cashew Chicken',
        category: 'Stir-fry',
        prices: { takeaway: 23.0, dineIn: 24.5, delivery: 27.0 },
        heat: 'Mild',
        description:
          'Tender chicken stir-fried with roasted cashews, onion, capsicum, and dried chili in a light oyster-soy sauce. Crunchy and satisfying',
        sortOrder: 19,
      },
      {
        title: 'Stir-fried Morning Glory',
        category: 'Stir-fry',
        prices: { takeaway: 18.5, dineIn: 19.5, delivery: 21.5 },
        heat: 'Medium',
        tags: ['Vegetarian'],
        description:
          'Crisp morning glory wok-tossed with garlic, chili, and fermented bean paste. Simple, healthy, and full of garlicky flavour',
        sortOrder: 20,
      },
      {
        title: 'Gai Yang',
        category: 'Stir-fry',
        prices: { takeaway: 24.0, dineIn: 25.5, delivery: 28.0 },
        heat: 'Medium',
        description:
          'Thai-style grilled marinated chicken with a golden, caramelised exterior. Served with jaew dipping sauce and sticky rice',
        sortOrder: 21,
      },
      {
        title: 'Pad Prik King',
        category: 'Stir-fry',
        prices: { takeaway: 23.0, dineIn: 24.5, delivery: 26.5 },
        heat: 'Hot',
        description:
          'Sliced pork belly stir-fried with long beans and red curry paste in a coconut cream reduction. Rich, oily, and intensely aromatic',
        sortOrder: 22,
      },
      {
        title: 'Crispy Fish with Chili Sauce',
        category: 'Stir-fry',
        prices: { takeaway: 29.0, dineIn: 30.5, delivery: 33.5 },
        heat: 'Hot',
        description:
          'Whole deep-fried fish topped with a vibrant sweet-and-sour chili sauce with cashews, onion, and capsicum. Crunchy, saucy, and irresistible',
        sortOrder: 23,
      },
      {
        title: 'Salt-crusted Grilled Fish',
        category: 'Stir-fry',
        prices: { takeaway: 34.0, dineIn: 36.0, delivery: 39.0 },
        heat: 'Mild',
        description:
          'Whole fish encrusted in coarse sea salt and grilled to perfection, keeping the flesh moist and flaky. Served with three-house dipping sauces',
        sortOrder: 24,
      },
      {
        title: 'Krapow Tofu',
        category: 'Stir-fry',
        prices: { takeaway: 21.0, dineIn: 22.0, delivery: 24.0 },
        heat: 'Hot',
        tags: ['Vegetarian'],
        description:
          "Crispy tofu wok-fried with holy basil, garlic, and fresh chili. A plant-based take on Thailand's most loved stir-fry",
        sortOrder: 25,
      },
      {
        title: 'Thai Fried Rice Prawns',
        category: 'Rice',
        prices: { takeaway: 22.0, dineIn: 23.5, delivery: 25.5 },
        heat: 'Mild',
        description:
          'Fragrant jasmine rice fried with tiger prawns, egg, onion, and tomato. Seasoned with fish sauce and served with cucumber and lime',
        sortOrder: 26,
      },
      {
        title: 'Pineapple Fried Rice',
        category: 'Rice',
        prices: { takeaway: 23.0, dineIn: 24.5, delivery: 26.5 },
        heat: 'Mild',
        description:
          'Jasmine rice wok-tossed with pineapple, cashews, raisins, curry powder, and prawns. Served inside a halved pineapple boat',
        sortOrder: 27,
      },
      {
        title: 'Hainanese Chicken Rice',
        category: 'Rice',
        prices: { takeaway: 22.5, dineIn: 24.0, delivery: 26.0 },
        heat: 'Mild',
        description:
          'Poached chicken served over fragrant rice cooked in chicken broth with ginger and pandan. Accompanied by chili, ginger, and dark soy dipping sauces',
        sortOrder: 28,
      },
      {
        title: 'Tom Yum Goong',
        category: 'Soup',
        prices: { takeaway: 26.0, dineIn: 27.5, delivery: 30.0 },
        heat: 'Hot',
        description:
          "Tiger prawns in a fiery, tangy broth infused with lemongrass, galangal, kaffir lime leaves, and fresh chili. Thailand's most iconic soup",
        sortOrder: 29,
      },
      {
        title: 'Tom Kha Gai',
        category: 'Soup',
        prices: { takeaway: 24.5, dineIn: 26.0, delivery: 28.5 },
        heat: 'Mild',
        description:
          'Creamy coconut milk soup with tender chicken, galangal, lemongrass, and mushrooms. Mild, aromatic, and deeply comforting',
        sortOrder: 30,
      },
      {
        title: 'Sour Curry',
        category: 'Soup',
        prices: { takeaway: 25.0, dineIn: 26.5, delivery: 29.0 },
        heat: 'Hot',
        description:
          'Southern Thai sour curry with fish, pineapple, and fresh turmeric in a light, tangy tamarind-based broth. Refreshing and bold',
        sortOrder: 31,
      },
      {
        title: 'Mango Sticky Rice',
        category: 'Dessert',
        prices: { takeaway: 14.0, dineIn: 15.0, delivery: 16.5 },
        heat: 'Sweet',
        description:
          'Sweet glutinous rice steamed with coconut cream, served alongside fresh ripe mango and drizzled with warm coconut sauce',
        sortOrder: 32,
      },
      {
        title: 'Coconut Ice Cream',
        category: 'Dessert',
        prices: { takeaway: 12.5, dineIn: 13.5, delivery: 14.5 },
        heat: 'Sweet',
        description:
          'Rich coconut milk ice cream served with crushed peanuts, sweet corn, sticky rice, and palm sugar syrup',
        sortOrder: 33,
      },
      {
        title: 'Kanom Krok',
        category: 'Dessert',
        prices: { takeaway: 13.5, dineIn: 14.5, delivery: 16.0 },
        heat: 'Sweet',
        description:
          'Traditional Thai coconut-rice pancakes with a crispy exterior and soft, creamy centre. Made fresh in a cast-iron pan',
        sortOrder: 34,
      },
      {
        title: 'Roti + Condensed Milk',
        category: 'Dessert',
        prices: { takeaway: 12.5, dineIn: 13.5, delivery: 14.5 },
        heat: 'Sweet',
        description:
          'Flaky, buttery pan-fried roti drizzled with sweet condensed milk. A simple yet indulgent Thai-Indian treat',
        sortOrder: 35,
      },
      {
        title: 'Thai Iced Tea',
        category: 'Drinks',
        prices: { takeaway: 7.5, dineIn: 8.0, delivery: 9.0 },
        heat: 'Sweet',
        description:
          'Traditional cha yen made with strongly brewed Ceylon tea, star anise, and sweetened condensed milk. Served over ice with a vibrant orange hue',
        sortOrder: 36,
      },
      {
        title: 'Coconut Water',
        category: 'Drinks',
        prices: { takeaway: 7.0, dineIn: 7.5, delivery: 8.5 },
        heat: 'Sweet',
        description:
          'Fresh young coconut water served chilled. Light, refreshing, and naturally sweet with a hint of tropical aroma',
        sortOrder: 37,
      },
      {
        title: 'Thai Black Coffee',
        category: 'Drinks',
        prices: { takeaway: 6.5, dineIn: 7.0, delivery: 8.0 },
        heat: 'Sweet',
        description:
          'Bold and smooth Thai-style black coffee (oliang) brewed with cardamom and brown sugar. Served over ice for a rich, aromatic pick-me-up',
        sortOrder: 38,
      },
      {
        title: 'Stir Fried Cashew Nut',
        category: 'Stir-fry',
        heat: 'Mild',
        description:
          'Roasted cashew nut stir fried with aromatic dried chili paste w seasonal vegetables',
        sortOrder: 39,
        variants: [
          {
            label: 'Vegetarian',
            prices: { takeaway: 19.9, dineIn: 17.9, delivery: 25.9 },
          },
          {
            label: 'Chicken',
            prices: { takeaway: 21.9, dineIn: 19.9, delivery: 28.9 },
          },
          {
            label: 'Beef',
            prices: { takeaway: 22.9, dineIn: 20.9, delivery: 29.9 },
          },
          {
            label: 'Prawn/Duck/Seafood',
            prices: { takeaway: 24.9, dineIn: 21.9, delivery: 31.9 },
          },
        ],
      },
      {
        title: 'Stir Fried Oyster Sauce (G)',
        category: 'Stir-fry',
        heat: 'Mild',
        description:
          'Stir fry with our own special oyster sauce w seasonal vegetables.',
        sortOrder: 40,
        variants: [
          {
            label: 'Vegetarian',
            prices: { takeaway: 19.9, dineIn: 17.9, delivery: 25.9 },
          },
          {
            label: 'Chicken',
            prices: { takeaway: 21.9, dineIn: 19.9, delivery: 28.9 },
          },
          {
            label: 'Beef',
            prices: { takeaway: 22.9, dineIn: 20.9, delivery: 29.9 },
          },
          {
            label: 'Prawn/Duck/Seafood',
            prices: { takeaway: 24.9, dineIn: 21.9, delivery: 31.9 },
          },
        ],
      },
      {
        title: 'Stir Fried Garlic & Pepper (G)',
        category: 'Stir-fry',
        heat: 'Mild',
        description:
          'Stir fried minced garlic and pepper sauce served w seasonal vegetables.',
        sortOrder: 41,
        variants: [
          {
            label: 'Vegetarian',
            prices: { takeaway: 19.9, dineIn: 17.9, delivery: 25.9 },
          },
          {
            label: 'Chicken',
            prices: { takeaway: 21.9, dineIn: 19.9, delivery: 28.9 },
          },
          {
            label: 'Beef',
            prices: { takeaway: 22.9, dineIn: 20.9, delivery: 29.9 },
          },
          {
            label: 'Prawn/Duck/Seafood',
            prices: { takeaway: 24.9, dineIn: 21.9, delivery: 31.9 },
          },
        ],
      },
    ]

    for (const item of items) {
      await ctx.db.insert('menus', {
        ...item,
        imageUrl: undefined,
        imageStorageId: undefined,
        available: true,
        featured: false,
        gallery: false,
      })
    }

    return `Seeded ${items.length} menu items`
  },
})

export const updateMenuDescriptions = mutation({
  args: {},
  handler: async (ctx) => {
    const descriptions: Record<string, string> = {
      'Chicken Satay': 'Served with peanut dipping sauce and cucumber relish',
      'Crispy Spring Rolls':
        'Crispy on the outside, soft on the inside. Served with sweet chili sauce',
      'Thai Fish Cakes':
        'Golden pan-fried fish cakes with red curry, kaffir lime leaves, and long beans. Served with sweet cucumber relish',
      'Tod Mun':
        'Traditional Thai fish patties with fragrant herbs, crispy on the outside and tender inside. Paired with Thai chili dipping sauce',
      'Moo Ping':
        'Grilled pork skewers marinated in coconut milk, garlic, and palm sugar. Served with sticky rice and jaew dipping sauce',
      'Som Tam':
        'Green papaya salad pounded fresh with lime, chili, fish sauce, palm sugar, peanuts, and dried shrimp. A classic Thai street-food favourite',
      'Larb Gai':
        'Minced chicken salad with roasted chili, lime juice, fresh mint, and shallots. Light, zesty, and full of bold northern Thai flavours',
      'Yum Woon Sen':
        'Glass noodle salad tossed with prawns, minced pork, cherry tomatoes, and shallots in a tangy lime and chili dressing',
      'Pad Thai Prawns':
        'Wok-tossed rice noodles with tiger prawns, egg, bean sprouts, and crushed peanuts in tamarind sauce. Served with lime wedge',
      'Pad See Ew':
        'Flat rice noodles stir-fried with Chinese broccoli, egg, and dark soy sauce. A comforting Thai-Chinese classic with smoky wok hei',
      'Pad Kee Mao':
        'Wide rice noodles wok-fried with fresh holy basil, chili, garlic, and your choice of protein. The legendary drunken noodle',
      'Boat Noodles':
        "Rich, dark pork-and-beef broth with thin rice noodles, pork balls, and crispy pork skin. Inspired by Bangkok's famous canal-side vendors",
      'Khao Soi':
        'Northern Thai coconut curry noodle soup with egg noodles, tender chicken, pickled mustard greens, and crispy noodle topping',
      'Green Curry Chicken':
        'Tender chicken simmered in fresh green curry paste with coconut milk, Thai eggplant, bamboo shoots, and sweet basil leaves',
      'Panang Curry':
        'Thick, creamy panang curry with sliced chicken, kaffir lime leaves, and a hint of peanuts. Richer and more concentrated than other Thai curries',
      'Massaman Beef':
        'Slow-braised beef in a mild Massaman curry with potatoes, roasted peanuts, onions, and warm spices like cardamom and cinnamon',
      'Red Curry Duck':
        'Pan-seared duck in a vibrant red curry with coconut milk, cherry tomatoes, pineapple, and Thai basil. A harmonious balance of sweet and savoury',
      'Holy Basil Stir-fry + Egg':
        "Wok-fired minced chicken with fresh holy basil, garlic, and bird's eye chili, topped with a crispy fried egg. A Thai comfort food staple",
      'Cashew Chicken':
        'Tender chicken stir-fried with roasted cashews, onion, capsicum, and dried chili in a light oyster-soy sauce. Crunchy and satisfying',
      'Stir-fried Morning Glory':
        'Crisp morning glory wok-tossed with garlic, chili, and fermented bean paste. Simple, healthy, and full of garlicky flavour',
      'Gai Yang':
        'Thai-style grilled marinated chicken with a golden, caramelised exterior. Served with jaew dipping sauce and sticky rice',
      'Pad Prik King':
        'Sliced pork belly stir-fried with long beans and red curry paste in a coconut cream reduction. Rich, oily, and intensely aromatic',
      'Crispy Fish with Chili Sauce':
        'Whole deep-fried fish topped with a vibrant sweet-and-sour chili sauce with cashews, onion, and capsicum. Crunchy, saucy, and irresistible',
      'Salt-crusted Grilled Fish':
        'Whole fish encrusted in coarse sea salt and grilled to perfection, keeping the flesh moist and flaky. Served with three-house dipping sauces',
      'Krapow Tofu':
        "Crispy tofu wok-fried with holy basil, garlic, and fresh chili. A plant-based take on Thailand's most loved stir-fry",
      'Thai Fried Rice Prawns':
        'Fragrant jasmine rice fried with tiger prawns, egg, onion, and tomato. Seasoned with fish sauce and served with cucumber and lime',
      'Pineapple Fried Rice':
        'Jasmine rice wok-tossed with pineapple, cashews, raisins, curry powder, and prawns. Served inside a halved pineapple boat',
      'Hainanese Chicken Rice':
        'Poached chicken served over fragrant rice cooked in chicken broth with ginger and pandan. Accompanied by chili, ginger, and dark soy dipping sauces',
      'Tom Yum Goong':
        "Tiger prawns in a fiery, tangy broth infused with lemongrass, galangal, kaffir lime leaves, and fresh chili. Thailand's most iconic soup",
      'Tom Kha Gai':
        'Creamy coconut milk soup with tender chicken, galangal, lemongrass, and mushrooms. Mild, aromatic, and deeply comforting',
      'Sour Curry':
        'Southern Thai sour curry with fish, pineapple, and fresh turmeric in a light, tangy tamarind-based broth. Refreshing and bold',
      'Mango Sticky Rice':
        'Sweet glutinous rice steamed with coconut cream, served alongside fresh ripe mango and drizzled with warm coconut sauce',
      'Coconut Ice Cream':
        'Rich coconut milk ice cream served with crushed peanuts, sweet corn, sticky rice, and palm sugar syrup',
      'Kanom Krok':
        'Traditional Thai coconut-rice pancakes with a crispy exterior and soft, creamy centre. Made fresh in a cast-iron pan',
      'Roti + Condensed Milk':
        'Flaky, buttery pan-fried roti drizzled with sweet condensed milk. A simple yet indulgent Thai-Indian treat',
      'Thai Iced Tea':
        'Traditional cha yen made with strongly brewed Ceylon tea, star anise, and sweetened condensed milk. Served over ice with a vibrant orange hue',
      'Coconut Water':
        'Fresh young coconut water served chilled. Light, refreshing, and naturally sweet with a hint of tropical aroma',
      'Thai Black Coffee':
        'Bold and smooth Thai-style black coffee (oliang) brewed with cardamom and brown sugar. Served over ice for a rich, aromatic pick-me-up',
    }

    const allMenus = await ctx.db.query('menus').collect()
    let updated = 0

    for (const menu of allMenus) {
      const desc = descriptions[menu.title]
      if (desc && menu.description !== desc) {
        await ctx.db.patch('menus', menu._id, { description: desc })
        updated++
      }
    }

    return `Updated ${updated} menu descriptions`
  },
})

export const seedPromotions = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('promotions').order('asc').collect()

    for (const doc of existing) {
      await ctx.db.delete('promotions', doc._id)
    }

    const now = Date.now()
    const promotions = [
      {
        title: 'Set for two',
        description:
          'Pick any two mains plus a starter to share — the perfect way to explore our menu together. From rich Massaman to zesty Som Tam, craft your own combo and save big.',
        priceAud: 49.0,
        badge: 'Limited',
        active: true,
        startDate: now,
        endDate: now + 30 * 24 * 60 * 60 * 1000,
        sortOrder: 1,
      },
      {
        title: 'Lunch bowl',
        description:
          'Fragrant jasmine rice topped with our signature Pad Krapow — wok-fired minced chicken with holy basil, fresh chilies, and garlic, crowned with a crispy fried egg. Bold, aromatic, and ready in minutes.',
        priceAud: 18.5,
        badge: 'Lunch',
        active: true,
        startDate: now,
        endDate: now + 30 * 24 * 60 * 60 * 1000,
        sortOrder: 2,
      },
      {
        title: 'Tom yum bundle',
        description:
          'A steaming bowl of our classic Tom Yum Goong — plump tiger prawns simmered in a tangy, chili-spiced broth with lemongrass, galangal, and kaffir lime leaves. Served with fluffy jasmine rice. Pure Thai comfort.',
        priceAud: 26.0,
        badge: 'Spicy',
        active: true,
        startDate: now,
        endDate: now + 30 * 24 * 60 * 60 * 1000,
        sortOrder: 3,
      },
    ]

    for (const promo of promotions) {
      await ctx.db.insert('promotions', {
        ...promo,
        imageUrl: undefined,
        imageStorageId: undefined,
      })
    }

    return `Seeded ${promotions.length} promotions`
  },
})

export const seedSiteInfo = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('siteInfo').first()
    if (existing) return 'Site info already seeded'

    const entries = [
      { key: 'phone', value: '+61 3 9802 1888' },
      {
        key: 'address',
        value: '503A Burwood Hwy, Vermont South VIC 3133, Australia',
      },
      { key: 'hours', value: 'Mon–Sun 16:30–21:30' },
      { key: 'email', value: 'vermontthai@hotmail.com' },
      { key: 'facebook', value: 'https://www.facebook.com/VermontThai/' },
      { key: 'instagram', value: '' },
      {
        key: 'googleMapsEmbedUrl',
        value:
          'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d196.88576900245346!2d145.1835198!3d-37.8562586!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad63ee2432dc289%3A0x6d37430b42be8614!2sVermont%20Thai!5e0!3m2!1sth!2sth!4v1781678399366!5m2!1sth!2sth',
      },
      { key: 'storefrontImageUrl', value: '' },
      { key: 'bankName', value: '' },
      { key: 'bankAccountName', value: '' },
      { key: 'bankBsb', value: '' },
      { key: 'bankAccountNumber', value: '' },
    ]

    for (const entry of entries) {
      await ctx.db.insert('siteInfo', entry)
    }

    return `Seeded ${entries.length} site info entries`
  },
})

export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('menuCategories').order('asc').take(100)
    if (existing.length > 0) {
      for (const doc of existing) {
        await ctx.db.delete('menuCategories', doc._id)
      }
    }

    const categories = [
      { name: 'Starters', sortOrder: 0 },
      { name: 'Salads', sortOrder: 1 },
      { name: 'Noodles', sortOrder: 2 },
      { name: 'Curries', sortOrder: 3 },
      { name: 'Stir-fry', sortOrder: 4 },
      { name: 'Rice', sortOrder: 5 },
      { name: 'Soup', sortOrder: 6 },
      { name: 'Dessert', sortOrder: 7 },
      { name: 'Drinks', sortOrder: 8 },
    ]

    for (const cat of categories) {
      await ctx.db.insert('menuCategories', cat)
    }

    return `Seeded ${categories.length} categories`
  },
})

export const seedBlogPosts = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('blogPosts').first()
    if (existing) return 'Blog posts already seeded'

    const now = Date.now()
    const day = 24 * 60 * 60 * 1000

    const posts = [
      {
        title: "The Art of Pad Thai: Thailand's Most Iconic Dish",
        slug: 'the-art-of-pad-thai',
        excerpt:
          'Discover the history, technique, and secrets behind Pad Thai — the stir-fried noodle dish that conquered the world.',
        content: `<h2>A Dish Born from Nation-Building</h2>
<p>Pad Thai wasn't always Thailand's national dish. In the 1930s, Prime Minister Plaek Phibunsongkhram launched a campaign to modernise Thailand and create a unified national identity. Part of this effort was promoting a single "national dish" — and Pad Thai was chosen. The government distributed recipes, set up street carts, and encouraged citizens to eat noodles as a symbol of Thai-ness.</p>
<h2>The Perfect Balance of Flavours</h2>
<p>What makes Pad Thai extraordinary is its balance of the four fundamental Thai tastes: <strong>sweet</strong> from palm sugar, <strong>sour</strong> from tamarind, <strong>salty</strong> from fish sauce, and a hint of <strong>spice</strong> from dried chili. At Vermont Thai, we honour this balance by making our tamarind sauce fresh daily and using only premium rice noodles that absorb flavour without turning mushy.</p>
<h2>Our Pad Thai Prawns</h2>
<p>Our Pad Thai Prawns features wok-tossed rice noodles with tiger prawns, egg, bean sprouts, and crushed peanuts in house-made tamarind sauce. The key is high heat — our woks burn at over 300°C, creating that sought-after <em>wok hei</em> (breath of the wok) that gives the noodles a subtle smokiness you can't replicate at home.</p>
<h2>Tips for the Best Pad Thai Experience</h2>
<ul>
<li>Squeeze fresh lime over the noodles just before eating — it brightens every flavour</li>
<li>Mix the crushed peanuts through the noodles for extra crunch</li>
<li>Add a dash of chili flakes if you prefer more heat</li>
<li>Pair it with a cold Thai iced tea to balance the savoury richness</li>
</ul>
<p>Next time you visit Vermont Thai, try our Pad Thai Prawns and taste the difference that tradition and technique make.</p>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Close-up%20of%20delicious%20Pad%20Thai%20with%20tiger%20prawns%2C%20crushed%20peanuts%2C%20lime%20wedge%20on%20dark%20elegant%20ceramic%20plate%2C%20steam%20rising%2C%20professional%20food%20photography%2C%20moody%20dark%20background%2C%20warm%20amber%20lighting&image_size=landscape_16_9',
        author: 'Chef Somchai',
        tags: ['Recipes', 'Thai Cuisine', 'Signature Dishes'],
        published: true,
        publishedAt: now - 1 * day,
        featured: true,
        sortOrder: 1,
        seoTitle: 'The Art of Pad Thai — Vermont Thai Melbourne',
        seoDescription:
          "Discover the history, technique, and secrets behind Pad Thai — Thailand's most iconic stir-fried noodle dish. Learn how Vermont Thai makes it authentic.",
      },
      {
        title: 'Understanding Thai Curry: Green, Red, Panang & Massaman',
        slug: 'understanding-thai-curry-guide',
        excerpt:
          "A complete guide to Thailand's four most beloved curries — what makes each one unique and how to choose your perfect bowl.",
        content: `<h2>More Than Just "Spicy Soup"</h2>
<p>Thai curries are worlds apart from Indian or Japanese curries. They're built on a foundation of fresh curry paste (not dried powder), coconut milk, and an intricate balance of herbs, spices, and aromatics. Every curry tells a story of Thailand's regional diversity.</p>
<h2>Green Curry (Kaeng Khiao Wan)</h2>
<p>The most vibrant of all Thai curries, green curry gets its colour from fresh green chilies, cilantro roots, and Thai basil. Despite its fiery appearance, it's actually one of the milder curries when prepared traditionally. Our <strong>Green Curry Chicken</strong> features tender chicken simmered in fresh green curry paste with coconut milk, Thai eggplant, bamboo shoots, and sweet basil leaves.</p>
<h2>Red Curry (Kaeng Phet)</h2>
<p>Red curry uses dried red chilies, giving it a deeper, earthier heat compared to green. It's versatile and pairs beautifully with duck — our <strong>Red Curry Duck</strong> combines pan-seared duck with coconut milk, cherry tomatoes, pineapple, and Thai basil for a harmonious balance of sweet and savoury.</p>
<h2>Panang Curry</h2>
<p>Thicker and more concentrated than other curries, Panang has a velvety texture with pronounced peanut and kaffir lime notes. Our <strong>Panang Curry</strong> with sliced chicken is rich, aromatic, and deeply satisfying — perfect for those who love intense flavour without overwhelming heat.</p>
<h2>Massaman Curry</h2>
<p>Influenced by Persian and Indian cuisine, Massaman is the mildest and most complex Thai curry. Warm spices like cardamom, cinnamon, and cloves blend with coconut milk and peanuts. Our <strong>Massaman Beef</strong> features slow-braised beef that falls apart after hours of gentle simmering.</p>
<h2>Which Curry Should You Try?</h2>
<p>If you're new to Thai curry, start with Massaman for its gentle warmth. If you love bold, herbaceous flavours, go for Green Curry. For something rich and nutty, Panang is your answer. And if you want a classic with depth, Red Curry Duck never disappoints.</p>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Four%20elegant%20Thai%20curry%20bowls%20arranged%20in%20a%20row%20on%20dark%20stone%20surface%20-%20green%20curry%20red%20curry%20panang%20curry%20massaman%20curry%20with%20rice%2C%20professional%20food%20photography%2C%20warm%20moody%20lighting%2C%20steam%20rising&image_size=landscape_16_9',
        author: 'Chef Somchai',
        tags: ['Curries', 'Thai Cuisine', 'Guide'],
        published: true,
        publishedAt: now - 5 * day,
        featured: true,
        sortOrder: 2,
        seoTitle:
          'Thai Curry Guide: Green, Red, Panang & Massaman — Vermont Thai',
        seoDescription:
          "A complete guide to Thailand's four most beloved curries. Learn what makes each unique and find your perfect bowl at Vermont Thai Melbourne.",
      },
      {
        title: "Tom Yum Goong: Thailand's Soul in a Bowl",
        slug: 'tom-yum-goong-soul-in-a-bowl',
        excerpt:
          "Why this fiery, tangy prawn soup is more than just a dish — it's an expression of Thai culinary philosophy.",
        content: `<h2>The Flavour Philosophy of Tom Yum</h2>
<p>Tom Yum Goong perfectly embodies the Thai culinary philosophy of balancing contrasting flavours. The name itself tells the story: <em>tom</em> means boiled, <em>yum</em> refers to the spicy-sour salad-like quality, and <em>goong</em> means prawn. Together, they create something far greater than the sum of its parts.</p>
<h2>The Holy Trinity of Thai Aromatics</h2>
<p>Three ingredients form the aromatic backbone of Tom Yum:</p>
<ul>
<li><strong>Lemongrass</strong> — citrusy, fresh, and slightly sweet</li>
<li><strong>Galangal</strong> — a cousin of ginger with piney, peppery notes</li>
<li><strong>Kaffir lime leaves</strong> — intensely fragrant with a unique citrus perfume</li>
</ul>
<p>These three are bruised and simmered to release their essential oils, creating a fragrant broth that perfumes the entire restaurant when a fresh pot is made.</p>
<h2>Clear vs. Creamy</h2>
<p>There are two styles of Tom Yum. <strong>Tom Yum Nam Sai</strong> (clear broth) is light, sharp, and intensely flavoured. <strong>Tom Yum Nam Khon</strong> (creamy) adds evaporated milk or coconut cream for a richer, smoother texture. At Vermont Thai, we serve the clear style — letting the natural flavours of tiger prawns and aromatics shine through.</p>
<h2>Our Tom Yum Goong</h2>
<p>We use only tiger prawns in our Tom Yum Goong, simmered in a fiery, tangy broth infused with fresh lemongrass, galangal, kaffir lime leaves, and bird's eye chili. Served with fluffy jasmine rice, it's the kind of dish that warms you from the inside out and leaves you craving more.</p>
<p>At $26, it's one of our most popular soups — and for good reason. Come taste why Tom Yum Goong is considered one of the world's greatest soups.</p>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Steaming%20bowl%20of%20Tom%20Yum%20Goong%20Thai%20soup%20with%20tiger%20prawns%2C%20lemongrass%2C%20mushrooms%2C%20chili%20on%20dark%20mat%20background%2C%20professional%20food%20photography%2C%20warm%20moody%20lighting%2C%20close-up%20shot&image_size=landscape_16_9',
        author: 'Chef Somchai',
        tags: ['Soup', 'Thai Cuisine', 'Signature Dishes'],
        published: true,
        publishedAt: now - 10 * day,
        featured: false,
        sortOrder: 3,
        seoTitle: "Tom Yum Goong: Thailand's Soul in a Bowl — Vermont Thai",
        seoDescription:
          "Discover why Tom Yum Goong is more than a soup — it's Thailand's culinary philosophy in a bowl. Learn about the aromatics and our authentic recipe.",
      },
      {
        title: "A Beginner's Guide to Thai Street Food Culture",
        slug: 'beginners-guide-thai-street-food',
        excerpt:
          "From Bangkok's bustling night markets to Melbourne's food scene — exploring the vibrant world of Thai street food.",
        content: `<h2>The Heartbeat of Thai Cuisine</h2>
<p>Street food isn't just cheap eating in Thailand — it's the heartbeat of the culture. Walk through any Thai city at dusk and you'll find sizzling woks, charcoal grills, and the intoxicating aroma of garlic, chili, and fresh herbs filling the air. It's where the best food is often found.</p>
<h2>Iconic Street Food Dishes</h2>
<p>Some of the world's most beloved Thai dishes started as street food:</p>
<ul>
<li><strong>Pad Thai</strong> — originally sold from pushcarts during Thailand's nation-building era</li>
<li><strong>Som Tam</strong> — green papaya salad pounded fresh to order in mortar and pestle</li>
<li><strong>Moo Ping</strong> — grilled pork skewers marinated in coconut milk and palm sugar</li>
<li><strong>Kanom Krok</strong> — sweet coconut pancakes cooked in cast-iron pans</li>
<li><strong>Gai Yang</strong> — charcoal-grilled marinated chicken, smoky and caramelised</li>
</ul>
<h2>The Night Market Experience</h2>
<p>Thai night markets (talat yen) are sensory overload in the best possible way. Neon lights, sizzling sounds, friendly vendors calling out specials, and an endless parade of dishes you've never tried before. The atmosphere is as important as the food itself.</p>
<h2>Bringing Street Food to Melbourne</h2>
<p>At Vermont Thai, we bring the spirit of Thai street food to Melbourne. Dishes like our <strong>Moo Ping</strong> (grilled pork skewers with sticky rice), <strong>Som Tam</strong> (green papaya salad), and <strong>Kanom Krok</strong> (coconut pancakes) are directly inspired by the street vendors of Bangkok and Chiang Mai. We believe you shouldn't have to fly 8 hours for authentic Thai flavours.</p>
<h2>Tips for Your First Street Food Experience</h2>
<p>If you're visiting Thailand, eat where the locals eat. Long queues at a humble cart usually mean exceptional food. Don't be afraid of spice — but always ask for "mai phet" (not spicy) if you're unsure. And carry small bills; most vendors don't accept cards.</p>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Bustling%20Thai%20street%20food%20market%20at%20night%20with%20sizzling%20woks%2C%20lanterns%2C%20steam%20and%20aroma%2C%20vendor%20cooking%20pad%20thai%2C%20vibrant%20colours%2C%20neon%20lights%2C%20cinematic%20photography%2C%20moody%20atmospheric&image_size=landscape_16_9',
        author: 'Nisa Patel',
        tags: ['Culture', 'Street Food', 'Thai Cuisine'],
        published: true,
        publishedAt: now - 15 * day,
        featured: false,
        sortOrder: 4,
        seoTitle:
          "A Beginner's Guide to Thai Street Food — Vermont Thai Melbourne",
        seoDescription:
          "Explore the vibrant world of Thai street food culture, from Bangkok's night markets to Melbourne. Discover iconic dishes and the philosophy behind street food.",
      },
      {
        title: "Khao Soi: Northern Thailand's Beloved Curry Noodle Soup",
        slug: 'khao-soi-northern-thai-noodle-soup',
        excerpt:
          'Why this coconut curry noodle soup from Chiang Mai is gaining fans around the world — and how we make it at Vermont Thai.',
        content: `<h2>A Taste of the North</h2>
<p>Khao Soi hails from Northern Thailand (Lanna region), where the cuisine is distinct from the central Thai food most foreigners know. Influenced by Burmese and Chinese cooking, Khao Soi features egg noodles in a rich coconut curry broth — topped with crispy fried noodles that add an irresistible crunch.</p>
<h2>The Two-Texture Magic</h2>
<p>What makes Khao Soi special is the interplay of textures. You get soft, boiled egg noodles swimming in the curry, contrasted with a generous handful of crispy fried noodles scattered on top. As you eat, the crispy noodles soften slightly in the broth, creating a constantly evolving mouthfeel.</p>
<h2>The Broth</h2>
<p>Traditional Khao Soi broth is made from a paste of dried red chilies, turmeric, galangal, lemongrass, garlic, shallots, and shrimp paste, simmered in coconut milk with a splash of chicken or pork stock. The result is a deeply aromatic, slightly sweet, and mildly spicy curry that's unlike any other Thai soup.</p>
<h2>Our Khao Soi at Vermont Thai</h2>
<p>Our Khao Soi features tender chicken in a house-made coconut curry broth with egg noodles, pickled mustard greens, and crispy noodle topping. We add a side of fresh shallots, lime wedge, and chili paste so you can customise each bowl to your taste.</p>
<p>At $24.50, it's a journey to the streets of Chiang Mai in every spoonful. If you haven't tried Khao Soi yet, it might just become your new favourite Thai dish.</p>
<h2>Serving Suggestions</h2>
<p>Pair Khao Soi with our <strong>Thai Iced Tea</strong> for the classic Northern Thai combination. The sweet, creamy tea perfectly balances the rich, spicy broth.</p>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Khao%20Soi%20Thai%20curry%20noodle%20soup%20in%20dark%20ceramic%20bowl%20with%20crispy%20fried%20noodle%20topping%20chicken%20pickled%20greens%20lime%20wedge%2C%20close-up%20professional%20food%20photography%2C%20warm%20moody%20lighting%2C%20dark%20background&image_size=landscape_16_9',
        author: 'Chef Somchai',
        tags: ['Noodles', 'Northern Thai', 'Signature Dishes'],
        published: true,
        publishedAt: now - 20 * day,
        featured: false,
        sortOrder: 5,
        seoTitle:
          "Khao Soi: Northern Thailand's Curry Noodle Soup — Vermont Thai",
        seoDescription:
          'Discover Khao Soi, the beloved coconut curry noodle soup from Chiang Mai. Learn its history and how Vermont Thai makes it authentic in Melbourne.',
      },
      {
        title: '5 Essential Thai Ingredients You Need in Your Kitchen',
        slug: '5-essential-thai-ingredients',
        excerpt:
          'Stock your pantry with these five foundational Thai ingredients and unlock a world of authentic flavours at home.',
        content: `<h2>Building Your Thai Pantry</h2>
<p>Thai cuisine relies on a handful of key ingredients that appear across countless dishes. With these five essentials, you can start cooking authentic Thai food at home — no shortcuts needed.</p>
<h2>1. Fish Sauce (Nam Pla)</h2>
<p>Fish sauce is the salt of Southeast Asian cooking. Made from fermented anchovies, it adds umami depth that table salt simply cannot replicate. A good quality fish sauce (like Three Crabs or Tra Chang) should be salty, complex, and slightly sweet — never purely fishy.</p>
<h2>2. Coconut Milk</h2>
<p>Not to be confused with coconut water, coconut milk is made by blending grated coconut meat with water and pressing the liquid. It forms the creamy base of most Thai curries and soups. Always buy full-fat coconut milk (not "lite") for authentic results.</p>
<h2>3. Palm Sugar</h2>
<p>Thai palm sugar has a caramel-like richness that regular white sugar lacks. It balances the heat and sourness in Thai dishes beautifully. Look for it in block form at Asian grocers — you can grate it or shave it as needed.</p>
<h2>4. Lemongrass</h2>
<p>Fresh lemongrass is irreplaceable in Thai cooking. Its citrusy, floral aroma forms the backbone of soups like Tom Yum and Tom Kha. Bruise the stalks with the back of a knife before adding them to release maximum flavour.</p>
<h2>5. Thai Bird's Eye Chili (Prik Kee Noo)</h2>
<p>These tiny chilies pack serious heat. They're used fresh in salads, stir-fries, and dipping sauces. Start with half a chili if you're heat-sensitive — you can always add more. For the freshest flavour, slice them just before cooking.</p>
<h2>Bonus: Kaffir Lime Leaves & Galangal</h2>
<p>If you can find them, kaffir lime leaves and galangal (Thai ginger) will elevate your Thai cooking dramatically. They're the secret ingredients that give Thai food its distinctive aroma.</p>
<p>Visit your local Asian grocer in Melbourne — Victoria Market and Springvale have excellent selections of all these ingredients.</p>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Flat%20lay%20of%20five%20essential%20Thai%20cooking%20ingredients%20on%20dark%20wooden%20surface%20-%20fish%20sauce%20bottle%2C%20coconut%20milk%20can%2C%20palm%20sugar%20block%2C%20fresh%20lemongrass%20stalks%2C%20red%20bird%20eye%20chilies%2C%20professional%20food%20photography%2C%20warm%20lighting&image_size=landscape_16_9',
        author: 'Nisa Patel',
        tags: ['Ingredients', 'Cooking Tips', 'Thai Cuisine'],
        published: true,
        publishedAt: now - 25 * day,
        featured: false,
        sortOrder: 6,
        seoTitle:
          '5 Essential Thai Ingredients for Your Kitchen — Vermont Thai',
        seoDescription:
          "Learn about the five must-have Thai ingredients: fish sauce, coconut milk, palm sugar, lemongrass, and bird's eye chili. Start cooking authentic Thai food at home.",
      },
      {
        title: "Mango Sticky Rice: Thailand's Favourite Dessert",
        slug: 'mango-sticky-rice-thailands-favourite-dessert',
        excerpt:
          'A simple yet sublime combination of ripe mango, sweet glutinous rice, and warm coconut sauce — the taste of a Thai summer.',
        content: `<h2>When Simplicity is Perfection</h2>
<p>Of all Thailand's desserts, Mango Sticky Rice (Khao Niao Mamuang) is perhaps the most beloved. It requires only three main ingredients — glutinous rice, fresh mango, and coconut cream — yet when prepared correctly, it's one of the most satisfying desserts in the world.</p>
<h2>The Rice</h2>
<p>The secret lies in the rice. Glutinous rice (also called sticky rice or sweet rice) must be soaked for at least 4 hours, then steamed — not boiled — in a traditional bamboo steamer or cheesecloth-lined pot. The steaming process gives the rice its characteristically chewy, tender texture while keeping each grain intact.</p>
<h2>The Coconut Sauce</h2>
<p>While the rice steams, a warm coconut sauce is prepared by gently heating coconut cream with sugar and a pinch of salt. This sauce is folded into the hot rice, giving it a glossy, fragrant sweetness. Extra sauce is drizzled on top just before serving.</p>
<h2>The Mango</h2>
<p>Only the best mangoes will do. In Thailand, that means Nam Dok Mai — an elongated, golden-yellow variety with impossibly sweet, buttery flesh. In Melbourne, we source the closest equivalent and ensure every mango is perfectly ripe before serving.</p>
<h2>Our Mango Sticky Rice</h2>
<p>At Vermont Thai, our Mango Sticky Rice is made fresh throughout the day. Sweet glutinous rice is steamed with coconut cream, served alongside fresh ripe mango, and drizzled with warm coconut sauce. At $14, it's the perfect ending to any Thai meal.</p>
<h2>Seasonal Special</h2>
<p>Mango Sticky Rice tastes best during mango season (November to March in Thailand). We celebrate this with special presentations and pairing suggestions — ask our staff about seasonal dessert specials.</p>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Beautiful%20plate%20of%20Mango%20Sticky%20Rice%20Thai%20dessert%20with%20ripe%20golden%20mango%20slices%20coconut%20cream%20drizzle%20sesame%20seeds%20on%20dark%20ceramic%20plate%2C%20professional%20food%20photography%2C%20warm%20moody%20lighting%2C%20close-up&image_size=landscape_16_9',
        author: 'Chef Somchai',
        tags: ['Dessert', 'Thai Cuisine', 'Recipes'],
        published: true,
        publishedAt: now - 30 * day,
        featured: false,
        sortOrder: 7,
        seoTitle:
          "Mango Sticky Rice: Thailand's Favourite Dessert — Vermont Thai",
        seoDescription:
          "Discover the secrets behind Thailand's most beloved dessert — Mango Sticky Rice. Learn about ingredients, technique, and how Vermont Thai makes it in Melbourne.",
      },
      {
        title: "The Story Behind Som Tam: Thailand's Green Papaya Salad",
        slug: 'story-behind-som-tham-green-papaya-salad',
        excerpt:
          'From a humble Isaan dish to an international sensation — the fascinating story of Som Tam and how to eat it like a local.',
        content: `<h2>Born in Thailand's Northeast</h2>
<p>Som Tam (also spelled Som Tum) originates from Isaan, Thailand's northeastern region that shares cultural and culinary ties with Laos. In Isaan, Som Tam isn't just food — it's a daily ritual, a social connector, and a point of fierce regional pride.</p>
<h2>The Mortar and Pestle Technique</h2>
<p>Traditional Som Tam is made by pounding ingredients in a large clay mortar (khrok) with a wooden pestle. This gentle bruising releases flavours without destroying the texture — a technique that's nearly impossible to replicate with a food processor.</p>
<p>The classic ingredients include shredded green papaya, long beans, cherry tomatoes, dried shrimp, peanuts, garlic, bird's eye chili, lime juice, fish sauce, and palm sugar. Each ingredient is added in sequence and lightly pounded.</p>
<h2>Many Styles, One Salad</h2>
<p>There are dozens of Som Tam variations across Thailand:</p>
<ul>
<li><strong>Som Tam Thai</strong> — the sweet, mild version with dried shrimp and peanuts (most common)</li>
<li><strong>Som Tam Lao</strong> — the original Isaan style, saltier and funkier with fermented fish sauce (padaek)</li>
<li><strong>Som Tam Pu</strong> — with whole salted crabs for extra umami</li>
<li><strong>Som Tam Pla Ra</strong> — with fermented fish paste, the most pungent version</li>
</ul>
<h2>How to Eat It</h2>
<p>In Thailand, Som Tam is always eaten with sticky rice (khao niao). You pinch a ball of sticky rice, dip it into the salad juices, and eat it together. It's traditionally served with grilled chicken (gai yang) and raw vegetables. At Vermont Thai, we serve it alongside our menu so you can create your own perfect combination.</p>
<h2>Our Som Tam</h2>
<p>Our Som Tam is pounded fresh to order with lime, chili, fish sauce, palm sugar, peanuts, and dried shrimp. It's one of our most popular dishes — bold, refreshing, and authentically spicy. Not for the faint of heart, but absolutely unforgettable.</p>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Traditional%20Som%20Tam%20green%20papaya%20salad%20in%20clay%20mortar%20with%20pestle%20alongside%20sticky%20rice%20and%20fresh%20vegetables%2C%20professional%20food%20photography%2C%20warm%20moody%20lighting%2C%20dark%20background%2C%20close-up&image_size=landscape_16_9',
        author: 'Nisa Patel',
        tags: ['Salad', 'Isaan Cuisine', 'Thai Culture'],
        published: true,
        publishedAt: now - 40 * day,
        featured: false,
        sortOrder: 8,
        seoTitle: "The Story Behind Som Tam: Thailand's Green Papaya Salad",
        seoDescription:
          "Discover the history and culture behind Som Tam, Thailand's beloved green papaya salad. From Isaan's kitchens to Vermont Thai in Melbourne.",
      },
      {
        title: 'Thai Iced Tea: The Sweet Science of Cha Yen',
        slug: 'thai-iced-tea-cha-yen',
        excerpt:
          "How strongly brewed Ceylon tea, star anise, and condensed milk create Thailand's most iconic beverage.",
        content: `<h2>More Than Just Iced Tea</h2>
<p>Thai Iced Tea (Cha Yen) is nothing like the iced tea you find elsewhere. Its distinctive orange colour, creamy sweetness, and complex spice notes make it one of the most recognisable Thai beverages in the world. It's the perfect companion to spicy Thai food, and many would argue a meal isn't complete without it.</p>
<h2>The Ingredients</h2>
<p>Traditional Cha Yen starts with strongly brewed Ceylon tea (or a Thai tea mix called cha dam). The tea is simmered with star anise, tamarind seed, and sometimes vanilla or cardamom. While still hot, sweetened condensed milk is added, creating a rich, creamy base. It's then poured over ice and often topped with evaporated milk for a beautiful layered effect.</p>
<h2>The Orange Colour</h2>
<p>The vibrant orange hue of Thai iced tea comes from food colouring added to the tea mix. In Thailand, most tea vendors use a mix of red and yellow food dyes. While it might seem unusual, the colour has become an integral part of the Cha Yen experience.</p>
<h2>Hot vs. Cold</h2>
<p>While Cha Yen (iced) is the most famous version, Cha Ron (hot Thai tea) is equally delicious and perfect for Melbourne's cooler months. Same ingredients, same preparation — just served steaming hot.</p>
<h2>Our Thai Iced Tea</h2>
<p>At Vermont Thai, our Thai Iced Tea is made with strongly brewed Ceylon tea, star anise, and sweetened condensed milk, served over ice with its signature vibrant orange hue. At just $7.50, it's the perfect way to cool down after a fiery Tom Yum or a spicy Som Tam.</p>
<h2>Fun Pairings</h2>
<p>Try Thai Iced Tea with:</p>
<ul>
<li><strong>Massaman Beef</strong> — the creamy tea balances the warm curry spices</li>
<li><strong>Mango Sticky Rice</strong> — doubles down on coconut sweetness for dessert lovers</li>
<li><strong>Pad Thai</strong> — the classic pairing, sweet tea meets tangy noodles</li>
</ul>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Glass%20of%20Thai%20Iced%20Tea%20Cha%20Yen%20with%20vibrant%20orange%20color%20and%20condensed%20milk%20layer%20on%20dark%20background%20with%20ice%20cubes%2C%20professional%20beverage%20photography%2C%20moody%20warm%20lighting%2C%20close-up&image_size=landscape_16_9',
        author: 'Nisa Patel',
        tags: ['Drinks', 'Thai Cuisine', 'Culture'],
        published: true,
        publishedAt: now - 50 * day,
        featured: false,
        sortOrder: 9,
        seoTitle: 'Thai Iced Tea: The Sweet Science of Cha Yen — Vermont Thai',
        seoDescription:
          "Learn how Thai Iced Tea (Cha Yen) is made with Ceylon tea, star anise, and condensed milk. Discover the story behind Thailand's most iconic beverage.",
      },
      {
        title: 'From Bangkok to Melbourne: Our Culinary Journey',
        slug: 'from-bangkok-to-melbourne-our-journey',
        excerpt:
          "The story of Vermont Thai — how a love for authentic Thai cooking brought us from the streets of Bangkok to Melbourne's vibrant food scene.",
        content: `<h2>Where It All Began</h2>
<p>Vermont Thai was born from a simple dream: to bring the authentic flavours of Thailand to Melbourne without compromise. Our head chef, trained in Bangkok's finest kitchens and Thailand's legendary street food scene, envisioned a restaurant where every dish tells a story of tradition, technique, and passion.</p>
<h2>The Bangkok Years</h2>
<p>Before Vermont Thai, our chef spent over a decade honing their craft in Bangkok — from the humble street stalls of Yaowarat (Chinatown) to upscale restaurants along Sukhumvit Road. These experiences shaped a cooking philosophy that values authenticity above all else.</p>
<p>Every recipe on our menu has been tested, refined, and perfected. Some have been passed down through generations, while others are creative interpretations that honour traditional techniques while embracing local Australian ingredients.</p>
<h2>Finding Our Home in Melbourne</h2>
<p>Melbourne was a natural choice. The city's multicultural food scene, appreciation for quality ingredients, and adventurous diners make it the perfect home for authentic Thai cuisine. We wanted to be more than just another Thai restaurant — we wanted to be a bridge between two food-loving cultures.</p>
<h2>Our Philosophy</h2>
<p>At Vermont Thai, we believe in three principles:</p>
<ol>
<li><strong>Authenticity</strong> — every dish must taste like it would in Thailand</li>
<li><strong>Freshness</strong> — we make our curry pastes, sauces, and stocks from scratch daily</li>
<li><strong>Hospitality</strong> — Thai culture values warm, generous service, and we carry that spirit into everything we do</li>
</ol>
<h2>Looking Forward</h2>
<p>As we grow, our commitment to authenticity remains unwavering. We continue to source the best Thai ingredients, refine our techniques, and explore new dishes from Thailand's diverse regional cuisines. Whether it's a classic Pad Thai or a lesser-known Northern Thai specialty, every plate that leaves our kitchen carries the soul of Thailand.</p>
<p>Thank you for being part of our journey. Sawasdee khrap!</p>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Warm%20inviting%20Thai%20restaurant%20interior%20with%20dark%20luxurious%20decor%2C%20warm%20amber%20lighting%2C%20wooden%20tables%2C%20Thai%20artwork%20on%20walls%2C%20elegant%20setting%2C%20professional%20restaurant%20photography%2C%20moody%20atmospheric&image_size=landscape_16_9',
        author: 'Vermont Thai Team',
        tags: ['Our Story', 'Culture', 'Melbourne'],
        published: true,
        publishedAt: now - 60 * day,
        featured: true,
        sortOrder: 10,
        seoTitle: 'From Bangkok to Melbourne: Our Story — Vermont Thai',
        seoDescription:
          "The story of Vermont Thai — how a love for authentic Thai cooking brought us from Bangkok's kitchens to Melbourne's vibrant food scene.",
      },
      {
        title: 'How to Order Thai Food Like a Local',
        slug: 'how-to-order-thai-food-like-a-local',
        excerpt:
          'Essential tips for navigating a Thai menu — from understanding heat levels to building the perfect meal combination.',
        content: `<h2>Beyond "Mild, Medium, or Hot"</h2>
<p>Ordering Thai food is an art that goes beyond simply choosing a heat level. Understanding how to balance dishes, share communally, and pair flavours will transform your Thai dining experience from good to extraordinary.</p>
<h2>Understanding Heat Levels</h2>
<p>Thai heat is measured differently than Western spice. In Thailand, dishes are typically not customised for heat — you eat them as the chef intended. However, since we're in Melbourne, we're happy to adjust:</p>
<ul>
<li><strong>Mild</strong> — gentle warmth, suitable for most palates</li>
<li><strong>Medium</strong>> — a pleasant tingle, the way most Thai people eat at home</li>
<li><strong>Hot</strong> — authentic Thai heat, not for the faint-hearted. Expect to sweat, but also to feel alive</li>
</ul>
<h2>Building the Perfect Thai Meal</h2>
<p>Thai meals are designed to be shared, not eaten as single courses. Here's how to build a balanced meal for two:</p>
<ol>
<li><strong>One starter to share</strong> — something light like Chicken Satay or Crispy Spring Rolls</li>
<li><strong>One soup</strong> — Tom Yum Goong or Tom Kha Gai to warm the palate</li>
<li><strong>One curry</strong> — Green Curry or Panang for the rich, coconut-creamy element</li>
<li><strong>One stir-fry or noodle dish</strong> — Pad Thai or Holy Basil Stir-fry for contrast</li>
<li><strong>One salad</strong> — Som Tam for a refreshing, acidic counterpoint</li>
<li><strong>Jasmine rice</strong> — the foundation that ties everything together</li>
<li><strong>Dessert</strong> — Mango Sticky Rice to end on a sweet note</li>
</ol>
<h2>The Sharing Philosophy</h2>
<p>In Thailand, food is communal. Everyone gets a plate of rice, and all dishes are placed in the centre of the table. You take a little of everything, creating your own perfect bite each time. This approach ensures variety and balance in every mouthful.</p>
<h2>Don't Skip the Condiments</h2>
<p>Every good Thai table has four condiments: fish sauce with chili, dried chili flakes, sugar, and vinegar. These aren't just for show — Thais use them to customise each dish as they eat. A dash of fish sauce adds saltiness, a pinch of sugar balances sourness, and chili flakes add heat where needed.</p>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Elegant%20Thai%20dinner%20table%20setup%20with%20multiple%20shared%20dishes%20of%20Thai%20food%20in%20dark%20ceramic%20bowls%2C%20jasmine%20rice%2C%20chopsticks%2C%20warm%20candlelight%2C%20luxurious%20dark%20setting%2C%20professional%20food%20photography%2C%20top-down%20view&image_size=landscape_16_9',
        author: 'Nisa Patel',
        tags: ['Guide', 'Dining Tips', 'Thai Culture'],
        published: true,
        publishedAt: now - 75 * day,
        featured: false,
        sortOrder: 11,
        seoTitle:
          'How to Order Thai Food Like a Local — Vermont Thai Melbourne',
        seoDescription:
          'Master the art of ordering Thai food with our guide. Learn about heat levels, building balanced meals, and dining tips from Vermont Thai Melbourne.',
      },
      {
        title: 'Massaman Beef: The Curry That Bridges Two Worlds',
        slug: 'massaman-beef-bridges-two-worlds',
        excerpt:
          "How Persian spices met Thai coconut milk to create Massaman — one of the world's most complex and beloved curries.",
        content: `<h2>A Curry with a Global History</h2>
<p>Massaman curry is unlike any other Thai curry. Its story begins in the 17th century, when Persian merchants and diplomats brought their spice traditions to the court of Ayutthaya, the capital of Siam (now Thailand). The result was a curry that bridges Middle Eastern and Southeast Asian cuisines — a true fusion dish centuries before fusion became a trend.</p>
<h2>The Spice Profile</h2>
<p>What sets Massaman apart is its warm spice blend:</p>
<ul>
<li><strong>Cardamom</strong> — floral and eucalyptus-like</li>
<li><strong>Cinnamon</strong> — warm and sweet</li>
<li><strong>Cloves</strong> — intense and aromatic</li>
<li><strong>Star anise</strong> — licorice-like sweetness</li>
<li><strong>Nutmeg</strong> — earthy and warming</li>
</ul>
<p>These spices are ground into a paste with dried red chilies, lemongrass, galangal, garlic, shallots, and shrimp paste — then simmered in coconut milk with potatoes, onions, roasted peanuts, and beef.</p>
<h2>The Slow-Braise Secret</h2>
<p>Great Massaman requires patience. The beef must be slow-braised for hours until it's fork-tender and the connective tissue has melted into the sauce, creating a rich, glossy gravy. At Vermont Thai, our Massaman Beef simmers for a minimum of 4 hours, developing layers of flavour that can't be rushed.</p>
<h2>Our Massaman Beef</h2>
<p>At $27, our Massaman Beef is one of our most popular curries — and one of CNN Travel's "World's 50 Most Delicious Foods." We serve it with fluffy jasmine rice, and we recommend pairing it with a cold Thai Iced Tea or a refreshing Coconut Water to balance the richness.</p>
<h2>A Curry for Everyone</h2>
<p>Massaman is the most approachable Thai curry for newcomers. Its mild heat, complex spices, and comforting richness make it universally appealing. If you've never tried Thai curry, start here — it might just change your life.</p>`,
        coverImageUrl:
          'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Rich%20Massaman%20Beef%20curry%20in%20dark%20ceramic%20bowl%20with%20tender%20slow-braised%20beef%20potatoes%20peanuts%20coconut%20milk%20sauce%20served%20with%20jasmine%20rice%2C%20professional%20food%20photography%2C%20warm%20moody%20lighting%2C%20close-up&image_size=landscape_16_9',
        author: 'Chef Somchai',
        tags: ['Curries', 'Thai Cuisine', 'History'],
        published: true,
        publishedAt: now - 90 * day,
        featured: false,
        sortOrder: 12,
        seoTitle:
          'Massaman Beef: The Curry That Bridges Two Worlds — Vermont Thai',
        seoDescription:
          "Discover the fascinating history of Massaman curry, from Persian origins to Thai tables. Learn why Vermont Thai's slow-braised Massaman Beef is a must-try.",
      },
    ]

    for (const post of posts) {
      await ctx.db.insert('blogPosts', post)
    }

    return `Seeded ${posts.length} blog posts`
  },
})
