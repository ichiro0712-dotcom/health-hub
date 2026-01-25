import puppeteer from 'puppeteer';

async function testGoogleHomepage() {
  console.log('🚀 Starting browser...');

  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: {
      width: 1280,
      height: 720
    }
  });

  try {
    // Open new page
    const page = await browser.newPage();

    console.log('📂 Opening Google homepage...');

    // Navigate to Google
    await page.goto('https://www.google.com', {
      waitUntil: 'networkidle2'
    });

    // Get page title
    const title = await page.title();
    console.log('📄 Page title:', title);

    // Take screenshot
    const screenshotPath = 'scripts/google-screenshot.png';
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log('📸 Screenshot saved to:', screenshotPath);

    // Display results
    console.log('\n✅ Test completed successfully!');
    console.log('═══════════════════════════════');
    console.log('Title:', title);
    console.log('Screenshot:', screenshotPath);
    console.log('═══════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error occurred:', error);
    throw error;
  } finally {
    // Close browser
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

// Run the test
testGoogleHomepage().catch(console.error);
