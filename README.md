# Meeting ROI Dashboard

A Forge app for Jira that helps teams understand and optimize the true cost of meetings by tracking meeting expenses, correlating them with sprint velocity, and providing AI-powered optimization suggestions.

**Runs on Atlassian** ✅ — This app is fully eligible for the Runs on Atlassian program with zero external data egress.

---

## 🎯 What is Meeting ROI Dashboard?

Meeting ROI Dashboard is a productivity analytics tool that answers the question: **"How much are meetings really costing our team?"**

### Key Features

| Feature | Description |
|---------|-------------|
| **💰 Cost Tracking** | Calculate the dollar cost of every meeting based on attendee roles and hourly rates |
| **📊 Analytics Dashboard** | Visualize monthly costs, meeting hours, cost per meeting type |
| **🤖 Rovo AI Integration** | Ask natural language questions about meeting costs and get optimization suggestions |
| **⚙️ Configurable Rates** | Set custom hourly rates for different roles (Engineer, PM, Manager, etc.) |
| **📈 Trend Analysis** | Track month-over-month trends to see if meeting hygiene is improving |

---

## 🤔 Why Use Meeting ROI Dashboard?

### The Problem
- The average employee spends **23 hours per week** in meetings
- Most teams have no visibility into the **actual dollar cost** of their meetings
- Unnecessary meetings kill productivity and hurt sprint velocity
- No data-driven way to decide which meetings to cut

### The Solution
Meeting ROI Dashboard gives you:

1. **Visibility** — See exactly how much your team spends on meetings
2. **Accountability** — Track which meeting types cost the most
3. **Insights** — Identify patterns and opportunities to optimize
4. **Action** — Get AI-powered suggestions to reduce meeting overhead

---

## 🚀 How to Use

### Installation

1. **Install the app** in your Jira Cloud site
2. Navigate to **Apps → Meeting ROI Dashboard** in Jira's left sidebar
3. Configure role hourly rates in **Admin Settings** (Settings → Apps → MeetingROI Settings)

### Logging Meetings

1. Click **"+ Log Meeting"** on the dashboard
2. Fill in meeting details:
   - **Title** — Meeting name (e.g., "Sprint Planning")
   - **Date** — When the meeting occurred
   - **Duration** — Length in minutes
   - **Meeting Type** — Standup, Planning, Retro, Review, 1:1, etc.
   - **Attendees** — Select roles that attended
3. See the **Estimated Cost** calculated in real-time
4. Click **"Save Meeting"** to log it

### Viewing Analytics

The dashboard shows:
- **Monthly Meeting Cost** — Total cost for the current month
- **Meeting Hours** — Total hours spent in meetings
- **Meeting Count** — Number of meetings logged
- **Avg Cost/Hour** — Average cost efficiency
- **Cost by Meeting Type** — Bar chart showing which types cost most
- **Recent Meetings** — List of recently logged meetings with costs

### Configuring Role Rates

1. Go to **Jira Admin Settings → Apps → MeetingROI Settings**
2. Add roles and their hourly rates:
   - Engineer: $75/hr
   - Senior Engineer: $100/hr
   - Product Manager: $90/hr
   - Engineering Manager: $130/hr
   - etc.
3. Set the default **Currency** and **Work Hours Per Day**
4. Click **Save Changes**

### Using the Rovo AI Agent

Ask the Meeting Insights Assistant natural language questions like:
- *"How much did we spend on meetings last month?"*
- *"Which meeting type costs us the most?"*
- *"Give me suggestions to reduce meeting overhead"*

---

## 📁 Project Structure

```
meeting-roi-dashboard/
├── manifest.yml                 # Forge app configuration
├── package.json                 # Node.js dependencies
├── src/
│   ├── index.js                 # Backend resolvers (API handlers)
│   └── utils/
│       ├── cost-calculator.js   # Meeting cost calculation logic
│       └── velocity-correlator.js # Sprint velocity correlation
├── static/
│   ├── dashboard-gadget/        # Main dashboard UI
│   │   ├── src/index.js         # Source code (pre-build)
│   │   ├── build/               # Bundled output
│   │   │   ├── index.html
│   │   │   ├── styles.css
│   │   │   └── bundle.js
│   │   └── webpack.config.js
│   └── admin-panel/             # Admin settings UI
│       ├── src/index.js
│       ├── build/
│       └── webpack.config.js
└── README.md
```

---

## 🛠️ Development

### Prerequisites

- Node.js 18+ (Node.js 22 recommended)
- Forge CLI: `npm install -g @forge/cli`
- Atlassian account with Jira Cloud access

### Setup

```bash
# Clone the repository
cd meeting-roi-dashboard

# Install root dependencies
npm install

# Install and build dashboard Custom UI
cd static/dashboard-gadget
npm install
npm run build

# Install and build admin panel Custom UI
cd ../admin-panel
npm install
npm run build

# Return to root
cd ../..
```

### Deploy

```bash
# Login to Forge
forge login

# Deploy to development
forge deploy

# Install on your Jira site
forge install
```

### Development Mode

```bash
# Run tunnel for hot reloading and logs
forge tunnel

# View logs
forge logs
```

### Building Custom UI

After making changes to the frontend code:

```bash
# Dashboard
cd static/dashboard-gadget && npm run build

# Admin Panel
cd static/admin-panel && npm run build

# Then redeploy
forge deploy
```

---

## 📋 Forge Modules

| Module | Type | Description |
|--------|------|-------------|
| `meeting-roi-page` | `jira:globalPage` | Main dashboard accessible from Apps menu |
| `meeting-roi-admin` | `jira:adminPage` | Configuration page for role rates |
| `meeting-insights-agent` | `rovo:agent` | AI assistant for meeting insights |
| `action-get-meeting-cost` | `action` | Rovo action to get cost summary |
| `action-get-velocity` | `action` | Rovo action for velocity correlation |
| `action-suggest-optimizations` | `action` | Rovo action for optimization tips |

---

## 🔒 Permissions

This app requires these Forge scopes:
- `read:jira-work` — Read project and sprint data
- `read:jira-user` — Read user information
- `storage:app` — Store meeting and configuration data

**No external network calls** — All data stays within Atlassian infrastructure.

---

## 📊 Data Storage

All data is stored using Forge Storage API:

| Key | Description |
|-----|-------------|
| `meetings` | Array of all logged meetings |
| `config:roleRates` | Array of role definitions with hourly rates |
| `config:settings` | General settings (currency, work hours) |

---

## 🧪 Testing

1. Deploy the app to your test site
2. Log several meetings with different types
3. Verify dashboard updates with correct calculations
4. Test the Rovo AI agent with various questions
5. Verify admin settings save and persist

---

## 📝 License

MIT License — Built for the Atlassian Forge platform.

---

## 🙏 Credits

Built with ❤️ using:
- [Atlassian Forge](https://developer.atlassian.com/platform/forge/)
- [Forge Custom UI](https://developer.atlassian.com/platform/forge/custom-ui/)
- [Rovo AI](https://developer.atlassian.com/platform/rovo/)

---

## 🐛 Troubleshooting

### Dashboard stuck on "Loading meeting data..."
- Run `forge tunnel` and check for errors
- Ensure Custom UI is built: `cd static/dashboard-gadget && npm run build`
- Check that `@forge/bridge` is installed in the static folder

### "Resolver is not a constructor" error
- Ensure `src/index.js` uses: `require('@forge/resolver').default`

### Styles not loading
- Verify manifest points to `build` folder not source folder
- Rebuild Custom UI and redeploy

### Save button not working
- Check browser console for errors
- Run `forge tunnel` to see backend errors
- Verify resolver functions are exported correctly
