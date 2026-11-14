import { createClient } from '@supabase/supabase-js';
import { DEMO_OWNER_EMAILS } from '@smartapp/core/demo/owners.js';
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
    const ownerEmail = DEMO_OWNER_EMAILS[shop.slug];
    if (!ownerEmail) {
      console.error(`No owner email for ${shop.slug}`);
      process.exit(1);
    }
    const existing = existingUsers.find((u) => u.email === ownerEmail);

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
        console.error(`Failed to update ${ownerEmail}:`, updateError.message);
        process.exit(1);
      }

      console.log(`${ownerEmail}: updated`);
    } else {
      const { error: createError } = await supabase.auth.admin.createUser({
        email: ownerEmail,
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
        console.error(`Failed to create ${ownerEmail}:`, createError.message);
        process.exit(1);
      }

      console.log(`${ownerEmail}: created`);
    }
  }

  // Super Admin (decision T88): the founder's own account gets the platform admin flag. It must exist
  // first (sign up or log in once); this never creates it or touches its password.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    const admin = existingUsers.find((u) => u.email?.toLowerCase() === adminEmail);
    if (!admin) {
      console.error(
        `ADMIN_EMAIL: no account for ${adminEmail} yet. Sign up once, then run this again.`,
      );
      process.exit(1);
    }
    const { error: adminError } = await supabase.auth.admin.updateUserById(admin.id, {
      app_metadata: { ...admin.app_metadata, platform_admin: true },
    });
    if (adminError) {
      console.error(`Failed to mark ${adminEmail} as Super Admin:`, adminError.message);
      process.exit(1);
    }
    console.log(`${adminEmail}: Super Admin`);
  }
}

void seedDemoAccounts();
