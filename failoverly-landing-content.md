# Failoverly — Landing Page Content

**Version:** 3 · September 20, 2026  
**Market:** US & Canada · American English · prices in USD  
**Stage:** Prelaunch waitlist  
**Offer:** Register before launch to receive the first month free when Failoverly launches. Regular subscription price: US$6.99/month.

> Sections 1–6 contain public-facing copy. Production notes, campaign guidance, and SEO requirements follow separately and are not page content.
> Product mechanics reflect the founder's clarification: the Mac's primary and backup connections use Failoverly's VPN infrastructure to preserve the service-facing connection during local network changes. This is the basis for the session-continuity promise; no measured switching times or universal performance guarantees are claimed.

---

## 1. Hero

**H1:** Wi-Fi drops. Your session stays.

**Subheadline:**
Failoverly keeps your Mac's calls, streams, and other online sessions connected when flaky Wi-Fi lets you down. It automatically switches to your phone's connection and back.

**Offer:** Join before launch for your first month free. US$6.99/month after that.

**Email field label:** Email address

**Button:** Join the waitlist

**Under the form:** Requires macOS + iPhone connected via USB.

---

## 2. Backup internet for calls, streams, and more

### Work calls & online coaching

**Wi-Fi glitched. You're still on the call.**
Show up for your team's Zoom meeting and give clients the full coaching session. Less worry about dropped calls, more attention for the people counting on you.

### Webinars & live streaming

**Make it to “Thanks for watching.”**
Keep your live stream going when Wi-Fi lets you down. Deliver the demo, take the last question, and give your audience the ending they came for.

### Online gaming

**Wi-Fi hiccuped. You're still in the match.**
Be there for the final push, the clutch play, and the teammates counting on you.

### Developers & DevOps

**Your SSH session outlives your Wi-Fi.**
Keep an eye on the deploy and finish your remote work without reopening your SSH session after a Wi-Fi drop.

### Traders

**The market moves. Stay with it.**
Follow your charts and check your orders without a Wi-Fi drop sending you back to the login screen.

---

## 3. How automatic internet failover works on your Mac

1. **Connect your phone as a backup.** Keep using your usual internet connection. Your phone provides a second way online.
2. **Let Failoverly watch your connection.** It runs in your Mac's menu bar and checks connection quality, including latency and packet loss. It can react even when Wi-Fi still looks connected.
3. **Keep your session going.** An encrypted VPN tunnel through Failoverly's servers keeps your online sessions connected as traffic moves to your phone. Failoverly switches back when your main connection recovers, saving cellular data for when you need backup.

---

## 4. When you need backup internet

**If your internet is rock-solid, you don't need Failoverly.**

It's for the days when the connection is uncertain and what you're doing matters:

- **Working while traveling:** Hotel Wi-Fi drops halfway through a client call.
- **Life as a digital nomad:** A new apartment or coworking space means another unfamiliar connection.
- **Using public Wi-Fi:** A busy café's network struggles just as your live session starts.
- **Working from home:** Your usual connection has an unreliable day, and your meeting can't wait.

---

## 5. Internet failover for Mac: FAQ

**What is Failoverly?**

Failoverly is an automatic internet failover app for macOS. It uses your iPhone as backup internet, preserving online sessions when your main connection fails or performs poorly. It's currently in prelaunch; join the waitlist to hear when it's available.

**What do I need to use Failoverly?**

A Mac, your usual internet connection, and **an iPhone connected over USB with Personal Hotspot enabled**. The iPhone needs cellular coverage and a plan that supports Personal Hotspot. Keep it plugged in while you want backup protection.

Your primary connection can be any internet connection your Mac uses, including Wi-Fi or Ethernet. At launch, backups are limited to iPhone over USB; Android and wireless hotspots aren't supported.

**Will my call or session disconnect when Failoverly switches connections?**

Failoverly preserves online sessions when it switches your Mac to a working backup. A brief slowdown or pause is still possible, especially with a weak cellular signal. It can't keep you online if both connections lose internet access or the online service itself is unavailable.

**How does Failoverly keep sessions connected, and is my connection secure?**

Your traffic passes through an encrypted VPN tunnel to servers we operate. Those servers maintain the connection to your online services while your Mac changes networks, so the session stays connected.

The tunnel adds encryption between your Mac and our servers, including on public Wi-Fi. Connections from our servers to online services use those services' own security, such as HTTPS.

**Why use Failoverly instead of my Mac's built-in hotspot features?**

Apple's Auto-Join Hotspot can connect a Mac to a nearby hotspot when Wi-Fi isn't available, automatically in macOS Tahoe 26 and later. Failoverly also reacts to poor connection quality, preserves sessions as it switches, and returns traffic to your main connection when it recovers.

**How much cellular data will Failoverly use?**

Your phone carries traffic while backup is needed. Usage depends on your apps and time on backup; video and live streaming can use substantial data. Your carrier bills cellular data separately from the Failoverly subscription.

**Will the VPN increase my ping or change my region?**

Routing through our VPN servers adds an extra network hop and can increase ping. Games and websites see a server's IP address, so your visible location may change to that server's region. The tradeoff is keeping your session connected when your local connection fails. Failoverly prioritizes session stability; it doesn't promise lower gaming latency.

**How much does Failoverly cost, and how do I get the free month?**

The regular subscription will cost **US$6.99/month**, in US dollars for both the US and Canada. Register your email before launch to earn your first month free when Failoverly becomes available. We'll email you at launch with instructions to claim it. Joining the waitlist doesn't start a subscription or charge you today.

---

## 6. Give your next session a backup plan.

**Offer:** Join before launch for your first month free. US$6.99/month after that.

**Email field label:** Email address

**Button:** Join the waitlist

**Under the form:** Requires macOS + iPhone connected via USB.

---

## 7. Production and editorial notes — not public copy

### Page flow and campaign message match

- Use one shared landing page: short hero → five equal-level segment cards → how it works → when backup is useful → FAQ → final CTA. All campaigns promote the same product, price, and early-bird offer.
- Keep cards equal in visual weight and structure. The work-call card addresses both employees and online coaches: showing up reliably for a team and delivering a paid session to a client. Its headline must apply to both.
- Match each ad's key benefit to the corresponding card. A coaching ad can focus on completing a paid client session; an employee-focused ad can focus on being present in a team meeting. Both lead to the shared work-call card. The other card headlines can serve as segment-specific ad starting points.
- Start with the same page and card order for every campaign. Track the segment through campaign parameters. No dynamic hero, automatic card reordering, or extra landing pages are needed for the initial test.
- Keep the hero compact: headline, short explanation, one combined offer/price line, and one email form with the device requirement beneath it. Use the same requirement under the final form: “Requires macOS + iPhone connected via USB.” Keep Personal Hotspot, cellular-plan details, and unsupported backups in the FAQ.
- Keep the regular price beside the early-bird offer before registration in both CTA sections; don't repeat either in separate hero elements. The free month is a prelaunch signup benefit, not an app available to try today.
- Mention the encrypted VPN tunnel explicitly in step 3 of How it works. The FAQ explains server operation, the scope of encryption, and the latency/location tradeoff. Security is a supporting property, not a separate primary benefit. Do not imply anonymity, no logging, or protection against every online threat.

### Demo brief

Place a short demo immediately after the compact hero, without crowding the headline and form: an online session is in progress, the main connection fails, Failoverly changes connection, and the same session continues. Show the main connection recovering and Failoverly switching back.

Use a real recording when available. Add a caption naming the app shown and the event demonstrated, with any observed pause left intact. A concept animation must be labeled as a product preview. Do not invent a switching time, claim zero packet loss, or use one recording as evidence of universal app compatibility.

For video, provide a visible description and appropriate captions or a text alternative. Product facts must remain readable outside the video. Keep decorative images' alt text empty; describe informative images by what they actually show.

### Form copy and behavior

- Use one email field and the same signup action in both locations. Add a nearby link to the published Privacy Policy explaining how signup data is used.
- **Success headline:** You're on the list.
- **Success body:** Your first month of Failoverly will be free at launch. We'll email you when it's ready and explain how to claim it.
- **Invalid email:** Please enter a valid email address.
- **Submission failed:** We couldn't add you to the waitlist. Please try again.
- **Already registered:** You're already on the waitlist. Your free month is reserved for launch.
- Only show success after the signup is saved. Preserve the offer for repeat registrations; do not imply that submitting again earns another free month.
- Use visible field labels, keyboard access, and accessible status messages. Keep research questions optional and after the successful signup.

### Copy boundaries and remaining launch decisions

The founder has confirmed the VPN architecture, service-session continuity during local adapter changes, the primary/backup connection scope, the final product name, the early-bird offer, and USD pricing. These are no longer open positioning questions.

The following details still need product decisions or verification; they are not public placeholders:

- Minimum supported macOS/iOS versions and compatibility with corporate VPNs and other VPN apps.
- Actual logging, telemetry, retention, server locations, and encryption implementation for the Privacy Policy and technical documentation. Operating the VPN servers does not itself establish a no-logs policy. The region disclosure does not imply users can choose a server region or that Failoverly provides location-unblocking features.
- Free-month redemption process and when the free period starts. Any payment-method requirement, renewal behavior, or claim deadline must be clearly stated in the eventual redemption flow; do not silently attach new eligibility conditions to the promised signup benefit.
- Tested applications, switching behavior, temporary pauses, and behavior when the VPN service or both internet connections are unavailable. The copy promises continuity through the connection switch, not universal uptime or zero latency.
- The launch date and distribution channel. Use the waitlist CTA until the product is available; don't show a download button before there is a working download.

### Alternative headlines and CTA for later tests

The public copy above is the default. These are alternatives to test separately, not additional text to put on the page.

| Element | Alternative | Reason to test |
|---|---|---|
| Hero H1 | Keep your session going when Wi-Fi fails. | Tests an explicit instruction against the shorter scenario-led default; keep Mac in the subheadline |
| Hero H1 | Your Wi-Fi has a bad day. Your call keeps going. | Tests a call-focused angle if campaign evidence favors that audience |
| CTA | Reserve my free month | Emphasizes the offer; keep “at launch” and the regular price immediately beside it |

### What the first campaign can establish

Track ad CTR, successful waitlist registrations per landing-page visit, and cost per registration separately by campaign and segment. Save the campaign source with the signup and deduplicate repeat registrations. Compare source, country, creative, and sample size before naming a winning segment.

The initial result measures **interest in the product with a visible future price and a free first month**. It does not by itself prove willingness to pay. The requirement under the form helps filter unsuitable signups; an optional post-signup question can check device readiness and intended use. After launch, measure offer redemption, successful setup, and conversion to a paid subscription. Keep the initial price and incentive consistent across segment campaigns; a later price experiment should vary price deliberately rather than confounding price with segment.

---

## 8. SEO and AI-search specification — not public copy

### Keyword and intent mapping

These are targeting hypotheses based on relevance and search intent, not a verified ranking of search volume or growth. The September 19 review did not obtain Keyword Planner data or a usable Google Trends series. Do not label these terms “most searched,” “trending,” or easy to rank for.

| Role | Queries / cluster | Placement |
|---|---|---|
| Main category | internet failover for Mac · automatic internet failover Mac · backup internet for Mac | This shared landing page |
| Setup and comparison | Mac switch to hotspot when Wi-Fi fails · automatically switch Wi-Fi to iPhone hotspot Mac | FAQ now; a useful setup guide later if justified |
| Video calls | backup internet for video calls · Wi-Fi drops during Zoom calls · dropped calls | Work-call card and campaign; a diagnostic guide later |
| Unreliable connections | flaky Wi-Fi · hotel Wi-Fi · public Wi-Fi | Hero and “When you need backup internet”; relevant context, not a claim to solve every Wi-Fi problem |
| Live streaming | backup internet for live streaming Mac | Streaming card and campaign; tested use-case material later |
| Network changes and SSH | SSH disconnects when changing networks | Developer card; a focused guide later |
| Commercial comparison | Speedify alternative for Mac · Speedify vs Failoverly | Future evidence-based comparison, not a keyword stuffed into the hero |

Gaming and trading remain equal-level campaign segments. Their presence does not require targeting broad troubleshooting queries such as “fix lag spikes,” “rubber banding fix,” or “trading platform keeps disconnecting” on the homepage. Those problems have causes outside local connection failure. Avoid promising a universal repair.

Measure US and Canada separately in Keyword Planner and Search Console. One English page and a clearly labeled USD price are sufficient for this campaign; separate regional pages are not part of this version.

Use the same problem and benefit in each ad and its landing-page card. Google evaluates ad relevance and landing-page experience, and higher auction-time quality can help reduce CPC. Repeating exact keywords alone does not establish relevance or guarantee a lower click price. [Google Ads: Ad Rank](https://support.google.com/google-ads/answer/1722122?hl=en).

### Page tags and headings

- **Title:** Internet Failover for Mac | Failoverly
- **Meta description:** Keep Mac calls and sessions connected on flaky Wi-Fi. Failoverly: US$6.99/month. Join before launch for your first month free when it becomes available.
- **URL:** `/` as the single product landing page.
- **Canonical:** The actual published homepage URL, also used for campaign URLs with tracking parameters. Do not publish the same copy again at `/internet-failover-mac`.
- **Language:** `en`.
- **H1:** Wi-Fi drops. Your session stays.
- **Open Graph:** Use the same product name, launch status, and offer. Supply an actual share image when the page is implemented.

Use the public section titles as H2s and the segment titles as H3s; “Hero” and the section numbers are editorial labels, not visible headings. Render FAQ questions as meaningful headings or accessible disclosure labels. Keep all answers in the HTML, including when collapsed. Metadata and the FAQ must describe the same product and offer as the visible page.

### Structured data

- Use `SoftwareApplication` to describe Failoverly, with `operatingSystem: macOS`, `applicationCategory: UtilitiesApplication`, and a description matching the visible copy.
- This is a prelaunch waitlist page. Do not mark the application as available to download or buy now. The visible future price is US$6.99/month; do not turn the early-bird month into a permanent zero-price app offer.
- When a subscription is actually available, any offer markup must match the price, USD currency, billing terms, and availability shown on the page.
- Do not fabricate `review` or `aggregateRating`. Google software-app rich-result eligibility has additional requirements; descriptive schema alone is not a promise of rich results. [Google: software-app structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app).
- Keep the FAQ for people and readable answers. Do not promise Google FAQ rich results: Google stopped showing them from May 7, 2026. `FAQPage` is not required for this version. [Google: documentation updates](https://developers.google.com/search/updates).

### Crawlability and consistent product facts

- Serve the core content as readable HTML. The name, product description, price, launch status, offer, and FAQ must be available without watching a video, logging in, or submitting an email.
- Keep normal crawlable links to the homepage, Privacy Policy, and any actual product documentation. Verify successful HTTP responses, robots directives, canonical, rendered content, and CDN/WAF access when implementing the site.
- For ChatGPT Search, `OAI-SearchBot` handles search access; allowing the training crawler `GPTBot` is a separate choice. Check actual crawler access as well as robots.txt. [OpenAI: crawler documentation](https://developers.openai.com/api/docs/bots).
- Give the same facts to people and crawlers. A concise definition, explicit FAQ, and original demo provide useful information; artificial keyword repetition and special paragraph lengths are not required.
- If maintaining `llms.txt`, synchronize it with this version when publishing: Failoverly only; macOS; any primary internet connection; iPhone over USB with Personal Hotspot as the launch backup; VPN servers operated by Failoverly; possible added latency and a different visible region; prelaunch waitlist; first month free for prerelease registrants; US$6.99/month regular subscription in both markets.
- Remove the retired working name from public HTML, metadata, schema, and llms.txt during implementation. Also remove stale backup-support and distribution claims. This document supplies the new content; updating the deployed page and supporting files is a separate implementation step.
- `llms.txt` is optional and is not a guarantee of retrieval or citation. Google says it does not improve Google Search visibility; ordinary SEO and useful content remain the foundation. [Google: AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

### Source and wording notes

- Product facts and the offer come from the founder's September 20 clarification. They are not inferred from competing products.
- The Apple FAQ comparison follows Apple's current description of Auto-Join Hotspot. It does not claim every Apple network switch necessarily drops a session. [Apple: Instant Hotspot and Auto-Join Hotspot](https://support.apple.com/en-us/109321).
- The VPN FAQ discloses an extra network hop, possible higher ping, and the server's IP address as the visible origin. Exact latency and regional effects depend on routing and server location; do not invent measured values or assume a game automatically changes its matchmaking region. [Cloudflare: VPN speed](https://www.cloudflare.com/learning/access-management/vpn-speed/), [Cloudflare: how a VPN works](https://www.cloudflare.com/learning/access-management/what-is-a-vpn/).
- State session continuity directly in the hero and use everyday scenarios in the cards. Their scope is preserving a session during a local connection failure with a working backup, as explained in the FAQ. A scenario headline still communicates a product promise; avoid “never disconnects,” “zero lag,” “instant switching,” and guaranteed financial outcomes.
- Use “secure” only in connection with the stated encryption benefit. Do not claim end-to-end encryption to every service, anonymity, a no-logs policy, or compatibility with every VPN.
- Use “your phone” in the short explanation. Show macOS + iPhone over USB under both forms; explain Personal Hotspot and full connection requirements in the FAQ.
- Use “first month free at launch” and the regular USD price together. Do not substitute “start a free trial” while the only available action is waitlist registration.

## 9. Revision notes — not public copy

- **v3 — September 20, 2026:** Put session continuity in the H1; restored scenario-led cards, Zoom/dropped-call vocabulary, and travel/public-Wi-Fi context; made the work-call offer relevant to both teams and coaches; added the macOS/iPhone/USB requirement beneath both forms; disclosed the VPN in How it works and its ping/visible-region tradeoff in the FAQ; replaced the standalone security benefit with audience qualification; combined the hero offer and price and merged the three offer-related FAQ entries into one.
- **v2 — September 20, 2026:** Rewrote the copy around the founder-confirmed VPN mechanism and scoped session-continuity promise; kept the five equal-level segment cards for separate ad campaigns to one shared page; defined the waitlist offer as one free month at launch and US$6.99/month thereafter; placed all detailed compatibility requirements in the FAQ; used only the final product name; corrected SEO/schema expectations and added consistent crawler-facing facts.
