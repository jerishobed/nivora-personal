import { chromium } from 'playwright';

// Target URL: Live Cloud Run URL or Local dev
const TARGET_URL = process.env.TARGET_URL || 'https://nivora-354978227611.asia-east1.run.app';
const FIREBASE_PROJECT_ID = 'personal-gemini-journal-fcc28';

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
      tags: ['Strategy', 'Goals', 'Productivity'],
      content: 'Starting this month with clear, intentional boundaries. Finalized our new product prototype and mapped out a disciplined savings target for upcoming travel. Feeling clear and aligned.'
    },
    {
      daysAgo: 24,
      title: 'Deep Work Sprint & Late Delivery',
      mood: 'stressed',
      tags: ['Engineering', 'Deadlines', 'Work'],
      content: 'Pushed hard to resolve infrastructure bottlenecks before the launch deadline. Ordered late-night delivery dinner because I was too depleted to cook. Reminding myself that rest is productive.'
    },
    {
      daysAgo: 21,
      title: 'Morning Trail Run & Mental Clarity',
      mood: 'calm',
      tags: ['Wellness', 'Fitness', 'Nature'],
      content: 'Woke up early for a 5k trail run before opening my laptop. The crisp morning air brought immense clarity. Zero urge to check social media or impulse browse.'
    },
    {
      daysAgo: 17,
      title: 'Client Consulting Milestone Delivered',
      mood: 'grateful',
      tags: ['Freelance', 'Milestone', 'Career'],
      content: 'Delivered the final milestone for our client consulting sprint. Grateful for smooth collaboration, positive feedback, and prompt invoice approval.'
    },
    {
      daysAgo: 14,
      title: 'Mid-Month Financial & Habits Review',
      mood: 'focused',
      tags: ['Finance', 'Habits', 'Review'],
      content: 'Reviewed spending across living and discretionary buckets. Noticed that dining expenses crept up during high-stress sprint days, but weekend mindfulness helped reset my budget trajectory.'
    },
    {
      daysAgo: 10,
      title: 'Weekend Book Club & Coffee Tasting',
      mood: 'reflective',
      tags: ['Community', 'Learning', 'Mindfulness'],
      content: 'Spent a leisurely Saturday afternoon discussing behavioral psychology and value-based living with close friends over pour-over coffees. Great perspectives on intentional living.'
    },
    {
      daysAgo: 7,
      title: 'Building Cloud Architecture & Flow State',
      mood: 'focused',
      tags: ['Engineering', 'Flow', 'Milestone'],
      content: 'Submerged in uninterrupted flow state optimizing our cloud backend services. Everything deployed cleanly with sub-second latency and zero errors.'
    },
    {
      daysAgo: 4,
      title: 'Restorative Evening & Weekly Meal Prep',
      mood: 'calm',
      tags: ['Wellness', 'Home', 'Mindfulness'],
      content: 'Took time to cook fresh wholesome meals for the week. Cooking is therapeutic and saves significantly on weekday takeout.'
    },
    {
      daysAgo: 2,
      title: 'Celebrating Product Launch',
      mood: 'inspired',
      tags: ['Celebration', 'Milestone', 'Team'],
      content: 'Our product release is officially live! Celebrated this huge milestone with dinner with the team. Proud of our persistence and craftsmanship.'
    },
    {
      daysAgo: 0,
      title: 'Clarity, Balance & Next Horizon',
      mood: 'grateful',
      tags: ['Gratitude', 'Clarity', 'Vision'],
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

function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`🚀 NIVORA Playwright Demo Data Loader`);
  console.log(`🌐 Target: ${TARGET_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({
    headless: false,
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

  // Wait until we are on the main dashboard
  try {
    await page.waitForSelector('#nivora-dashboard, #nivora-brand-compact, #header-settings-btn', {
      timeout: 180000 // 3 minutes
    });
    console.log(`\n✅ Authenticated successfully!`);
  } catch (err) {
    console.error(`❌ Authentication timeout.`);
    await browser.close();
    return;
  }

  await page.waitForTimeout(1000);

  // Retrieve Firebase Auth UID and Access Token from browser localStorage
  const authInfo: any = await page.evaluate(`(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('firebase:authUser:')) {
        try {
          const authUser = JSON.parse(localStorage.getItem(k) || '{}');
          if (authUser?.uid) {
            return {
              uid: authUser.uid,
              idToken: authUser.stsTokenManager?.accessToken
            };
          }
        } catch (e) {}
      }
    }
    return null;
  })()`);

  if (!authInfo?.uid || !authInfo?.idToken) {
    console.error(`❌ Could not retrieve user ID token from session.`);
    return;
  }

  const { uid, idToken } = authInfo;
  console.log(`User UID: ${uid}`);
  console.log(`\n📦 Seeding Demo Data directly to Firestore...`);

  const firestoreBase = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const headers = {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  };

  // 1. Update Profile Preferences
  try {
    console.log(`Setting Profile: "${DEMO_DATA.preferences.displayName}"...`);
    await fetch(`${firestoreBase}/settings/preferences`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          displayName: { stringValue: DEMO_DATA.preferences.displayName },
          bio: { stringValue: DEMO_DATA.preferences.bio },
          currency: { stringValue: DEMO_DATA.preferences.currency },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      })
    });
  } catch (e) {
    console.warn('Preferences warning:', e);
  }

  // 2. Add Journals
  console.log(`Writing 10 Journal reflections...`);
  let jIdx = 0;
  for (const j of DEMO_DATA.journals) {
    const dateStr = getPastDate(j.daysAgo);
    const docId = `demo-j-${Date.now()}-${jIdx++}`;
    const tagsList = j.tags.map((t) => ({ stringValue: t }));

    await fetch(`${firestoreBase}/journal/${docId}`, {
      method: 'PATCH',
      headers,
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
  }

  // 3. Add Financial Transactions
  console.log(`Writing 14 Financial transactions...`);
  let tIdx = 0;
  for (const t of DEMO_DATA.transactions) {
    const dateStr = getPastDate(t.daysAgo);
    const docId = `demo-t-${Date.now()}-${tIdx++}`;

    await fetch(`${firestoreBase}/transactions/${docId}`, {
      method: 'PATCH',
      headers,
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
  }

  // 4. Add Milestone Goals
  console.log(`Writing 3 Milestone goals...`);
  let gIdx = 0;
  for (const g of DEMO_DATA.goals) {
    const docId = `demo-g-${Date.now()}-${gIdx++}`;

    await fetch(`${firestoreBase}/goals/${docId}`, {
      method: 'PATCH',
      headers,
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
  }

  console.log(`\n🎉 Success! All Demo Data has been written to your account:`);
  console.log(`   • 10 Journal Reflections spanning 4 weeks`);
  console.log(`   • 14 Financial Transactions across Income & Expenses`);
  console.log(`   • 3 Milestone Vision Goals`);
  console.log(`   • Profile updated to "Alex Morgan"`);

  // Reload the browser page to display fresh realtime data
  console.log(`\n🔄 Refreshing dashboard...`);
  await page.reload();
  await page.waitForTimeout(3000);

  console.log(`\n✨ Done! You can now explore your live account in the browser.`);
  console.log(`Press Ctrl+C when you are done.`);

  // Keep browser open for inspection
  await page.waitForTimeout(180000);
  await browser.close();
}

run().catch((err) => {
  console.error('Playwright Script Error:', err);
  process.exit(1);
});
