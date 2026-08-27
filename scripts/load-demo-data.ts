import { chromium } from 'playwright';

// Target URL: Local dev or Live Cloud Run URL
const TARGET_URL = process.env.TARGET_URL || 'https://nivora-354978227611.asia-east1.run.app';

// Rich, curated demo dataset showing realistic cross-domain behavioral patterns
const DEMO_DATA = {
  preferences: {
    displayName: 'Alex Morgan',
    bio: 'Product Designer & Tech Creator exploring mindful living, intentional finance, and personal growth.',
    currency: 'USD'
  },
  journals: [
    {
      daysAgo: 28,
      title: 'Setting Fresh Monthly Intentions',
      mood: 'inspired',
      tags: 'Strategy, Goals, Productivity',
      content: 'Starting this month with clear, intentional boundaries. Finalized our new product prototype and mapped out a disciplined savings target for upcoming travel. Feeling clear and aligned.'
    },
    {
      daysAgo: 24,
      title: 'Deep Work Sprint & Late Delivery',
      mood: 'stressed',
      tags: 'Engineering, Deadlines, Work',
      content: 'Pushed hard to resolve infrastructure bottlenecks before the launch deadline. Ordered late-night delivery dinner because I was too depleted to cook. Reminding myself that rest is productive.'
    },
    {
      daysAgo: 21,
      title: 'Morning Trail Run & Mental Clarity',
      mood: 'calm',
      tags: 'Wellness, Fitness, Nature',
      content: 'Woke up early for a 5k trail run before opening my laptop. The crisp morning air brought immense clarity. Zero urge to check social media or impulse browse.'
    },
    {
      daysAgo: 17,
      title: 'Client Consulting Milestone Delivered',
      mood: 'grateful',
      tags: 'Freelance, Milestone, Career',
      content: 'Delivered the final milestone for our client consulting sprint. Grateful for smooth collaboration, positive feedback, and prompt invoice approval.'
    },
    {
      daysAgo: 14,
      title: 'Mid-Month Financial & Habits Review',
      mood: 'focused',
      tags: 'Finance, Habits, Review',
      content: 'Reviewed spending across living and discretionary buckets. Noticed that dining expenses crept up during high-stress sprint days, but weekend mindfulness helped reset my budget trajectory.'
    },
    {
      daysAgo: 10,
      title: 'Weekend Book Club & Coffee Tasting',
      mood: 'reflective',
      tags: 'Community, Learning, Mindfulness',
      content: 'Spent a leisurely Saturday afternoon discussing behavioral psychology and value-based living with close friends over pour-over coffees. Great perspectives on intentional living.'
    },
    {
      daysAgo: 7,
      title: 'Building Cloud Architecture & Flow State',
      mood: 'focused',
      tags: 'Engineering, Flow, Milestone',
      content: 'Submerged in uninterrupted flow state optimizing our cloud backend services. Everything deployed cleanly with sub-second latency and zero errors.'
    },
    {
      daysAgo: 4,
      title: 'Restorative Evening & Weekly Meal Prep',
      mood: 'calm',
      tags: 'Wellness, Home, Mindfulness',
      content: 'Took time to cook fresh wholesome meals for the week. Cooking is therapeutic and saves significantly on weekday takeout.'
    },
    {
      daysAgo: 2,
      title: 'Celebrating Product Launch',
      mood: 'inspired',
      tags: 'Celebration, Milestone, Team',
      content: 'Our product release is officially live! Celebrated this huge milestone with dinner with the team. Proud of our persistence and craftsmanship.'
    },
    {
      daysAgo: 0,
      title: 'Clarity, Balance & Next Horizon',
      mood: 'grateful',
      tags: 'Gratitude, Clarity, Vision',
      content: 'Reflecting on the harmony built between mindful daily thoughts and conscious financial progress. Entering the new week with grounded calm and clear focus.'
    }
  ],
  transactions: [
    { daysAgo: 26, amount: 4500.0, type: 'income', category: 'Salary', description: 'Monthly Creative Director Salary' },
    { daysAgo: 25, amount: 1400.0, type: 'expense', category: 'Housing', description: 'Monthly Apartment Rent' },
    { daysAgo: 24, amount: 48.5, type: 'expense', category: 'Food', description: 'Late-night Sprint Delivery Dinner' },
    { daysAgo: 23, amount: 120.0, type: 'expense', category: 'Bills', description: 'High-Speed Fiber Internet & Utilities' },
    { daysAgo: 20, amount: 145.5, type: 'expense', category: 'Food', description: 'Whole Foods Organic Groceries' },
    { daysAgo: 18, amount: 85.0, type: 'expense', category: 'Health', description: 'Monthly Gym & Climbing Membership' },
    { daysAgo: 16, amount: 1250.0, type: 'income', category: 'Freelance', description: 'Client UI Consulting Milestone 2' },
    { daysAgo: 15, amount: 18.0, type: 'expense', category: 'Food', description: 'Specialty Pour-over Coffee & Pastry' },
    { daysAgo: 14, amount: 35.0, type: 'expense', category: 'Education', description: 'Design & AI Masterclass Subscription' },
    { daysAgo: 12, amount: 130.0, type: 'expense', category: 'Food', description: 'Weekly Farmers Market & Pantry Restock' },
    { daysAgo: 9, amount: 24.0, type: 'expense', category: 'Transport', description: 'Metro & Transit Card Reload' },
    { daysAgo: 5, amount: 45.0, type: 'expense', category: 'Shopping', description: 'Ergonomic Desk Accessories' },
    { daysAgo: 3, amount: 95.0, type: 'expense', category: 'Food', description: 'Fresh Produce & Meal Prep Groceries' },
    { daysAgo: 2, amount: 72.0, type: 'expense', category: 'Entertainment', description: 'Team Milestone Celebration Dinner' }
  ],
  goals: [
    {
      title: 'Emergency Peace-of-Mind Fund',
      targetAmount: 5000,
      currentAmount: 4200,
      category: 'savings',
      targetDate: '2026-12-31'
    },
    {
      title: 'Kyoto & Tokyo Autumn Trip',
      targetAmount: 2800,
      currentAmount: 1750,
      category: 'travel',
      targetDate: '2026-10-15'
    },
    {
      title: 'Mindfulness Wellness Retreat',
      targetAmount: 800,
      currentAmount: 800,
      category: 'wellness',
      targetDate: '2026-09-01'
    }
  ]
};

async function run() {
  console.log(`\n======================================================`);
  console.log(`🚀 NIVORA Playwright Demo Data Loader`);
  console.log(`🌐 Target: ${TARGET_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({
    headless: false, // Headed so user can see and interactively log in
    slowMo: 50
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 }
  });

  const page = await context.newPage();

  console.log(`Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL);

  // Check if authenticated
  console.log(`Waiting for user authentication...`);
  console.log(`👉 Please sign in to your account in the browser window if not already signed in.`);

  // Wait until we are on the main dashboard (UserCard or Dashboard visible)
  try {
    await page.waitForSelector('#nivora-dashboard, #nivora-brand-compact, #header-settings-btn', {
      timeout: 180000 // 3 minutes timeout to give user time to sign in
    });
    console.log(`\n✅ Authenticated successfully!`);
  } catch (err) {
    console.error(`❌ Authentication timeout. Please make sure you sign in.`);
    await browser.close();
    return;
  }

  // Brief delay for Firebase state stabilization
  await page.waitForTimeout(1500);

  console.log(`\n📦 Injecting Demo Data into your account...`);

  // Direct injection into user's authenticated Firestore session via page evaluation
  const result = await page.evaluate(async (data) => {
    try {
      // Access Firebase db and auth from window or module context
      const getPastDate = (daysAgo: number) => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
      };

      // Find user UID from Firebase Auth in localStorage or indexedDB
      let authUser: any = null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('firebase:authUser:')) {
          try {
            authUser = JSON.parse(localStorage.getItem(k) || '{}');
            break;
          } catch (e) {}
        }
      }

      if (!authUser?.uid) {
        return { success: false, error: 'Could not find authenticated UID in session.' };
      }

      const uid = authUser.uid;

      // Use Firestore REST API with user's ID token for direct, lightning-fast batch seeding
      const idToken = authUser.stsTokenManager?.accessToken;
      if (!idToken) {
        return { success: false, error: 'Could not retrieve ID token.' };
      }

      const projectId = 'personal-gemini-journal-fcc28';
      const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;

      // 1. Update Preferences
      await fetch(`${firestoreBase}/settings/preferences`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            displayName: { stringValue: data.preferences.displayName },
            bio: { stringValue: data.preferences.bio },
            currency: { stringValue: data.preferences.currency },
            updatedAt: { stringValue: new Date().toISOString() }
          }
        })
      });

      // 2. Add Journals
      let journalCount = 0;
      for (const j of data.journals) {
        const dateStr = getPastDate(j.daysAgo);
        const docId = `demo-j-${Date.now()}-${journalCount}`;
        const tagsList = j.tags.split(',').map((t: string) => ({ stringValue: t.trim() }));

        await fetch(`${firestoreBase}/journal/${docId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              title: { stringValue: j.title },
              content: { stringValue: j.content },
              date: { stringValue: dateStr },
              mood: { stringValue: j.mood },
              tags: { arrayValue: { values: tagsList } },
              createdAt: { stringValue: `${dateStr}T10:00:00.000Z` },
              updatedAt: { stringValue: `${dateStr}T10:00:00.000Z` }
            }
          })
        });
        journalCount++;
      }

      // 3. Add Transactions
      let transCount = 0;
      for (const t of data.transactions) {
        const dateStr = getPastDate(t.daysAgo);
        const docId = `demo-t-${Date.now()}-${transCount}`;

        await fetch(`${firestoreBase}/transactions/${docId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              amount: { doubleValue: t.amount },
              type: { stringValue: t.type },
              category: { stringValue: t.category },
              description: { stringValue: t.description },
              date: { stringValue: dateStr },
              createdAt: { stringValue: `${dateStr}T12:00:00.000Z` }
            }
          })
        });
        transCount++;
      }

      // 4. Add Goals
      let goalCount = 0;
      for (const g of data.goals) {
        const docId = `demo-g-${Date.now()}-${goalCount}`;

        await fetch(`${firestoreBase}/goals/${docId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              title: { stringValue: g.title },
              targetAmount: { doubleValue: g.targetAmount },
              currentAmount: { doubleValue: g.currentAmount },
              category: { stringValue: g.category },
              targetDate: { stringValue: g.targetDate },
              createdAt: { stringValue: new Date().toISOString() },
              updatedAt: { stringValue: new Date().toISOString() }
            }
          })
        });
        goalCount++;
      }

      return {
        success: true,
        journalsAdded: journalCount,
        transactionsAdded: transCount,
        goalsAdded: goalCount
      };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }, DEMO_DATA);

  if (result.success) {
    console.log(`\n🎉 Success! Added:`);
    console.log(`   • ${result.journalsAdded} Journal Reflections across 4 weeks`);
    console.log(`   • ${result.transactionsAdded} Financial Transactions`);
    console.log(`   • ${result.goalsAdded} Milestone Goals`);
    console.log(`   • Updated Profile & Preferences to "Alex Morgan"`);

    // Reload page to reflect fresh Firestore realtime data
    await page.reload();
    await page.waitForTimeout(3000);
    console.log(`\n✨ Dashboard reloaded with live demo data.`);
    console.log(`\nPress Ctrl+C in terminal when you are done exploring.`);
  } else {
    console.warn(`⚠️ Direct API injection notice:`, result.error);
    console.log(`Falling back to UI-driven button loader...`);
    // Click "Load Sample Data" button if visible
    const seedBtn = await page.$('#dashboard-seed-sample-btn');
    if (seedBtn) {
      await seedBtn.click();
      console.log(`Clicked sample data button.`);
      await page.waitForTimeout(3000);
    }
  }

  // Keep browser open for user inspection
  await page.waitForTimeout(60000);
  await browser.close();
}

run().catch((err) => {
  console.error('Playwright Script Error:', err);
  process.exit(1);
});
