import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const env = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = env.match(/DATABASE_URL="([^"]+)"/);
const connectionString = dbUrlMatch ? dbUrlMatch[1] : '';

if (!connectionString) {
  console.error("No DATABASE_URL found.");
  process.exit(1);
}

const client = new Client({ connectionString });

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to DB. Creating stock deduction triggers...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION deduct_stock_on_order()
      RETURNS TRIGGER AS $$
      DECLARE
          r RECORD;
          sub RECORD;
      BEGIN
          -- For each recipe item linked to the product
          FOR r IN SELECT inventory_item_id, quantity FROM recipes WHERE product_id = NEW.product_id LOOP
              -- Is this a sub-recipe?
              IF EXISTS (SELECT 1 FROM stock_items WHERE id = r.inventory_item_id AND category = 'Sub-Recipe') THEN
                  -- Deduct raw ingredients of the sub-recipe
                  FOR sub IN SELECT child_item_id, quantity FROM sub_recipe_ingredients WHERE parent_item_id = r.inventory_item_id LOOP
                      UPDATE stock_items 
                      SET current_stock = current_stock - (sub.quantity * r.quantity * NEW.quantity)
                      WHERE id = sub.child_item_id;
                  END LOOP;
              ELSE
                  -- Deduct raw ingredient directly
                  UPDATE stock_items 
                  SET current_stock = current_stock - (r.quantity * NEW.quantity)
                  WHERE id = r.inventory_item_id;
              END IF;
          END LOOP;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_deduct_stock ON order_items;
      CREATE TRIGGER trigger_deduct_stock
      AFTER INSERT ON order_items
      FOR EACH ROW
      EXECUTE FUNCTION deduct_stock_on_order();
    `);
    console.log('Deduct trigger created successfully.');

    await client.query(`
      CREATE OR REPLACE FUNCTION return_stock_on_void()
      RETURNS TRIGGER AS $$
      DECLARE
          ord_item RECORD;
          r RECORD;
          sub RECORD;
      BEGIN
          IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
              -- Loop over all items in this order
              FOR ord_item IN SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id LOOP
                  -- Same logic but adding stock
                  FOR r IN SELECT inventory_item_id, quantity FROM recipes WHERE product_id = ord_item.product_id LOOP
                      IF EXISTS (SELECT 1 FROM stock_items WHERE id = r.inventory_item_id AND category = 'Sub-Recipe') THEN
                          FOR sub IN SELECT child_item_id, quantity FROM sub_recipe_ingredients WHERE parent_item_id = r.inventory_item_id LOOP
                              UPDATE stock_items 
                              SET current_stock = current_stock + (sub.quantity * r.quantity * ord_item.quantity)
                              WHERE id = sub.child_item_id;
                          END LOOP;
                      ELSE
                          UPDATE stock_items 
                          SET current_stock = current_stock + (r.quantity * ord_item.quantity)
                          WHERE id = r.inventory_item_id;
                      END IF;
                  END LOOP;
              END LOOP;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_return_stock ON orders;
      CREATE TRIGGER trigger_return_stock
      AFTER UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION return_stock_on_void();
    `);
    console.log('Return trigger created successfully.');

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

migrate();
