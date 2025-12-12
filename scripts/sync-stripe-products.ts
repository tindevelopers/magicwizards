import "dotenv/config";
import { syncProducts } from "../src/app/actions/stripe/products";

async function main() {
  console.log("🔄 Syncing Stripe products to database...");

  try {
    const result = await syncProducts();

    if (result.success) {
      console.log(`✅ Successfully synced ${result.count} products`);
    } else {
      console.error("❌ Failed to sync products:", result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error syncing products:", error);
    process.exit(1);
  }
}

main();




