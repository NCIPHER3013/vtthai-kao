/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAuth from "../adminAuth.js";
import type * as blogPosts from "../blogPosts.js";
import type * as contacts from "../contacts.js";
import type * as dashboard from "../dashboard.js";
import type * as fileManager from "../fileManager.js";
import type * as foodImages from "../foodImages.js";
import type * as menuCategories from "../menuCategories.js";
import type * as menus from "../menus.js";
import type * as migrations from "../migrations.js";
import type * as orders from "../orders.js";
import type * as posAuth from "../posAuth.js";
import type * as posCatalog from "../posCatalog.js";
import type * as posInventory from "../posInventory.js";
import type * as posLib from "../posLib.js";
import type * as posOrders from "../posOrders.js";
import type * as posPeople from "../posPeople.js";
import type * as posSchema from "../posSchema.js";
import type * as posSeed from "../posSeed.js";
import type * as posTouch from "../posTouch.js";
import type * as promotions from "../promotions.js";
import type * as reservations from "../reservations.js";
import type * as seed from "../seed.js";
import type * as seoSettings from "../seoSettings.js";
import type * as siteInfo from "../siteInfo.js";
import type * as siteOrders from "../siteOrders.js";
import type * as trackingCodes from "../trackingCodes.js";
import type * as updateEntree from "../updateEntree.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAuth: typeof adminAuth;
  blogPosts: typeof blogPosts;
  contacts: typeof contacts;
  dashboard: typeof dashboard;
  fileManager: typeof fileManager;
  foodImages: typeof foodImages;
  menuCategories: typeof menuCategories;
  menus: typeof menus;
  migrations: typeof migrations;
  orders: typeof orders;
  posAuth: typeof posAuth;
  posCatalog: typeof posCatalog;
  posInventory: typeof posInventory;
  posLib: typeof posLib;
  posOrders: typeof posOrders;
  posPeople: typeof posPeople;
  posSchema: typeof posSchema;
  posSeed: typeof posSeed;
  posTouch: typeof posTouch;
  promotions: typeof promotions;
  reservations: typeof reservations;
  seed: typeof seed;
  seoSettings: typeof seoSettings;
  siteInfo: typeof siteInfo;
  siteOrders: typeof siteOrders;
  trackingCodes: typeof trackingCodes;
  updateEntree: typeof updateEntree;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
