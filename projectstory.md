# Meeting ROI Dashboard

## Inspiration

We've all been there — back-to-back meetings that leave no time for actual work. The average knowledge worker spends **23 hours per week** in meetings, yet most teams have zero visibility into what this costs them.

The question that inspired this project was simple but powerful: **"What if we could put a dollar value on every meeting?"**

By making the hidden cost of meetings visible, teams can make data-driven decisions about which meetings are worth having — and which ones are just expensive distractions.

## What it does

**Meeting ROI Dashboard** is a Forge app for Jira that:

- 📊 **Tracks meeting costs** — Calculate the dollar cost of each meeting based on attendee roles and hourly rates
- 📈 **Visualizes trends** — See monthly costs, meeting hours, and cost breakdowns by meeting type
- 🤖 **AI-powered insights** — Ask the Rovo AI agent questions like *"How much did we spend on meetings last month?"*
- ⚙️ **Configurable rates** — Set custom hourly rates for different roles (Engineer: $75/hr, Manager: $130/hr, etc.)

The cost formula is straightforward:

$$\text{Meeting Cost} = \sum_{i=1}^{n} (\text{Duration}_{\text{hours}} \times \text{Rate}_i)$$

Where $n$ is the number of attendees and $\text{Rate}_i$ is each attendee's hourly rate.

## How we built it

Built entirely on the **Atlassian Forge** platform:

- **Backend**: Node.js 22 with `@forge/resolver` for API handlers
- **Frontend**: Custom UI with Webpack bundling and `@forge/bridge`
- **Storage**: Forge Storage API for all meeting data and configuration
- **AI**: Rovo Agent with custom actions for meeting insights
- **Styling**: Custom CSS with Atlassian Design System colors

The app is **100% Runs on Atlassian eligible** — no external network calls, all data stays within Atlassian infrastructure.

## Challenges we ran into

1. **Custom UI Bridge Issues** — The `@forge/bridge` import wasn't working initially. Learned that Custom UI requires Webpack bundling — you can't just use ES module imports directly in the browser.

2. **Resolver Constructor Error** — Hit `TypeError: Resolver is not a constructor` because the import syntax needed to be `require('@forge/resolver').default`.

3. **Styling Not Loading** — External CSS wasn't being applied properly. Solved by ensuring the manifest pointed to the `build` folder with bundled assets.

4. **RoA Eligibility** — Initially used an external Chart.js CDN which violated "Runs on Atlassian" requirements. Replaced with pure CSS bar charts.

## Accomplishments that we're proud of

- ✅ **Zero external dependencies** — Fully RoA eligible
- ✅ **Real-time cost preview** — See estimated cost as you fill out the meeting form
- ✅ **Rovo AI integration** — Natural language queries about meeting costs
- ✅ **Clean UI** — Modern design that feels native to Jira
- ✅ **Production-ready** — Full CRUD operations, error handling, and data persistence

## What we learned

- Forge Custom UI requires **bundling** (Webpack) to resolve npm modules like `@forge/bridge`
- The "Runs on Atlassian" program has strict requirements — no external URLs, fonts, or scripts
- Rovo agents are powerful for exposing data through natural language
- Forge Storage has a simple but effective API for persistent data

## What's next for meeting-roi-dashboard

- 📅 **Calendar integration** — Auto-import meetings from Google/Outlook calendars
- 📊 **Sprint velocity correlation** — Show how meeting hours impact story points delivered
- 🔔 **Budget alerts** — Notify teams when they exceed meeting cost thresholds
- 📱 **Slack/Teams notifications** — Summarize weekly meeting costs in team channels
- 🌍 **Multi-currency support** — Support for USD, EUR, GBP, INR, etc.
