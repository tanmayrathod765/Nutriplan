# 🚀 Quick Start Guide - NutriPlan AI

## 30-Second Setup

### 1. Install dependencies
```bash
cd "d:/hackathon claude"
npm install
```

### 2. Add API Key
Create `.env.local`:
```
ANTHROPIC_API_KEY=your-key-here
```

Get free API key: https://console.anthropic.com

### 3. Start the app
```bash
npm run dev
```

### 4. Open browser
http://localhost:3000

## 🎯 First Time User?

1. **Click "Ramesh" profile** (bottom of Step 1) to load demo data
2. **Click "Yes, create my plan!"** on the budget page
3. **Wait 30 seconds** for AI to generate 7-day meal plan
4. **Explore** the plan, swap meals, view dashboard

## ✨ Popular Actions

| What | How |
|------|-----|
| Load demo profile | Click green button on Step 1 |
| Upload medical report | Scroll down on Step 3, click "PDF Upload" |
| Swap a meal | Click "🔄 Swap This Meal" on any meal card |
| View nutrient details | Click meal card to expand |
| Export grocery list | Go to `/grocery`, click "Share on WhatsApp" |
| See health dashboard | Navigate from navbar → "Dashboard" |

## 🆘 Troubleshooting

**"API key not working"?**
→ Check you copied the entire key correctly  
→ Verify at https://console.anthropic.com/account/keys

**"Nothing happens when I click Create Plan"?**
→ Check browser console (F12)  
→ Ensure API key is in `.env.local`  
→ Refresh page

**"Form doesn't save my input"?**
→ Check browser JavaScript is enabled  
→ Try a different browser  
→ Clear browser cookies

## 📚 File Structure Quick Ref

```
app/page.tsx          ← Start here (intake form)
app/preview/page.tsx  ← Budget review
app/plan/page.tsx     ← 7-day meal plan
```

## 🎨 Customize

**Add new dishes?**  
→ Edit `lib/indianFoodDB.ts` → add to `INDIAN_DISHES` array

**Change disease targets?**  
→ Edit `lib/nutritionTargets.ts` → update `BASE_TARGETS`

**Change colors?**  
→ Edit `tailwind.config.ts` → update `colors` section

## 💡 Pro Tips

- Use **demo profiles** to showcase features quickly
- **Mobile device?** App is fully responsive
- **Export to WhatsApp?** Works on `/grocery` page
- **No internet needed** to view generated plans (only for generation)

## 📞 Support

App looks broken? Try this:
```bash
rm -rf .next node_modules
npm install
npm run dev
```

---

**Ready? Open http://localhost:3000 →**
