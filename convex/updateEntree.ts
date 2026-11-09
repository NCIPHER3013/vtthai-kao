import { mutation } from './_generated/server'

const entreeData = [
  { title: 'Chicken Satay Skewer', price: 13.9 },
  { title: 'Vegetarian Spring Roll', price: 9.9 },
  { title: 'Chicken Spring Roll', price: 9.9 },
  { title: 'Chicken Pop', price: 9.9 },
  { title: 'Lava Spring Roll', price: 13.9 },
  { title: 'Vegetarian Curry Puff', price: 11.9 },
  { title: 'Chicken Curry Puff', price: 11.9 },
  { title: 'Prawn Spring Roll', price: 12.9 },
  { title: 'Fried Tofu', price: 11.9 },
  { title: 'Thai Fish Cake', price: 12.9 },
  { title: 'Prawn Dim Sim', price: 12.9 },
  { title: 'Calamari Rings', price: 14.9 },
]

export const updateTakeaway = mutation({
  args: {},
  handler: async (ctx) => {
    const allMenus = await ctx.db.query('menus').collect()
    let updated = 0
    const notFound: Array<string> = []

    for (const item of entreeData) {
      // Find a match based on ignoring case and special characters (like "(4pcs)")
      const match = allMenus.find((m) => {
        const mTitle = m.title.toLowerCase()
        const iTitle = item.title.toLowerCase()
        return mTitle.includes(iTitle) || iTitle.includes(mTitle)
      })

      if (match) {
        const currentPrices = match.prices || {
          takeaway: 0,
          dineIn: 0,
          delivery: 0,
        }
        await ctx.db.patch('menus', match._id, {
          prices: {
            ...currentPrices,
            takeaway: item.price,
          },
        })
        updated++
      } else {
        notFound.push(item.title)
        // Create new item if not found
        await ctx.db.insert('menus', {
          title: item.title,
          category: 'Starters',
          prices: {
            takeaway: item.price,
            dineIn: item.price + 1, // default assumption
            delivery: item.price + 2, // default assumption
          },
          heat: 'Mild',
          available: true,
          sortOrder: updated + 100, // put them at the end
        })
        updated++
      }
    }

    return { updated, notFound }
  },
})
