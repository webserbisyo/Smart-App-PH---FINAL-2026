import { createClient } from '@supabase/supabase-js';
import { DEMO_SHOPS } from '@smartapp/core/demo/shops.js';

async function seedDemoAccounts(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  const demoPassword = process.env.DEMO_PASSWORD;

  if (!supabaseUrl || !supabaseSecretKey || !demoPassword) {
    console.error(
      'Missing required environment variables: SUPABASE_URL, SUPABASE_SECRET_KEY, or DEMO_PASSWORD',
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (listError) {
    console.error('Failed to list existing users:', listError.message);
    process.exit(1);
  }

  const existingUsers = usersData?.users ?? [];

  for (const shop of DEMO_SHOPS) {
    const existing = existingUsers.find((u) => u.email === shop.ownerEmail);

    if (existing) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          full_name: shop.ownerName,
        },
        app_metadata: {
          demo_shop: shop.slug,
        },
      });

      if (updateError) {
        console.error(`Failed to update ${shop.ownerEmail}:`, updateError.message);
        process.exit(1);
      }

      console.log(`${shop.ownerEmail}: updated`);
    } else {
      const { error: createError } = await supabase.auth.admin.createUser({
        email: shop.ownerEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          full_name: shop.ownerName,
        },
        app_metadata: {
          demo_shop: shop.slug,
        },
      });

      if (createError) {
        console.error(`Failed to create ${shop.ownerEmail}:`, createError.message);
        process.exit(1);
      }

      console.log(`${shop.ownerEmail}: created`);
    }
  }
}

void seedDemoAccounts();
