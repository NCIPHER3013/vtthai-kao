import * as adminAuth from '../convex/adminAuth';
import * as blogPosts from '../convex/blogPosts';
import * as contacts from '../convex/contacts';
import * as dashboard from '../convex/dashboard';
import * as fileManager from '../convex/fileManager';
import * as foodImages from '../convex/foodImages';
import * as menuCategories from '../convex/menuCategories';
import * as menus from '../convex/menus';
import * as orders from '../convex/orders';
import * as posAuth from '../convex/posAuth';
import * as posCatalog from '../convex/posCatalog';
import * as posInventory from '../convex/posInventory';
import * as posOrders from '../convex/posOrders';
import * as posPeople from '../convex/posPeople';
import * as posTouch from '../convex/posTouch';
import * as promotions from '../convex/promotions';
import * as reservations from '../convex/reservations';
import * as seoSettings from '../convex/seoSettings';
import * as siteInfo from '../convex/siteInfo';
import * as siteOrders from '../convex/siteOrders';
import * as trackingCodes from '../convex/trackingCodes';
import type { Registered } from './wrappers';

const modules: Record<string, Record<string, unknown>> = {
  adminAuth,
  blogPosts,
  contacts,
  dashboard,
  fileManager,
  foodImages,
  menuCategories,
  menus,
  orders,
  posAuth,
  posCatalog,
  posInventory,
  posOrders,
  posPeople,
  posTouch,
  promotions,
  reservations,
  seoSettings,
  siteInfo,
  siteOrders,
  trackingCodes,
};

export const registry = new Map<string, Registered>();
for (const [mod, exports] of Object.entries(modules)) {
  for (const [name, val] of Object.entries(exports)) {
    if (val && (val as Registered).__fn) registry.set(`${mod}:${name}`, val as Registered);
  }
}
