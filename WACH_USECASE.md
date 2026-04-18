# WACH — The AI Bouncer That Never Sleeps, Never Blinks, and Never Gets Fooled by a Dodgy QR Code

---

## The Problem (A Horror Story That Happens Every Day)

You're at a restaurant. There's a QR code on the table. You scan it expecting the menu.

Congratulations. You just handed your banking credentials to a server farm in a country you've never visited.

Or you're at a conference. Someone's sticker on the wall says "Free WiFi — scan here." You scan it. You don't get WiFi. You get a malware installer that moves in, rearranges your files, and never leaves. Like a terrible houseguest with ransomware.

Or you get an email. There's a link. It *looks* like your bank. It *smells* like your bank. It is absolutely not your bank.

**Cybercriminals are getting creative. Your eyes are not enough anymore.**

**Enter WACH.**

---

## What It Actually Does (In Human Language)

### It Scans Before You Get Scammed
WACH is a Chrome extension that sits quietly in your browser like a vigilant security guard — except unlike most security guards, it's actually paying attention. The moment you encounter a URL or scan a QR code, WACH runs it through a battle-tested AI model and tells you: *safe* or *run*.

No waiting. No Googling "is this website legit?" at 1 AM. No asking your tech-savvy friend who's tired of your questions. Just instant, AI-powered judgement.

### The Brain Behind It — A Hybrid Stacking Model
This is where it gets nerdy and impressive. WACH doesn't rely on a single AI opinion. That would be too easy to fool. Instead, it uses a **hybrid stacking ensemble** — multiple machine learning models that vote, argue, and collectively agree on whether a URL wants to steal your identity:

- **Random Forest** — the wise elder. Looks at hundreds of decision trees and takes a democratic vote. Hard to manipulate, loves patterns.
- **MLP (Multi-Layer Perceptron)** — the deep thinker. A neural network that finds relationships no human would ever notice in a URL string.
- **KNN (K-Nearest Neighbours)** — the social profiler. Compares your suspicious URL against thousands of known bad neighbours. *"Show me your friends and I'll tell you who you are."*
- **Stacking Logistic Regression** — the final judge. Takes all the above opinions, weighs them intelligently, and delivers the verdict.

The result? **91.30% accuracy** on real-world data. Not a toy dataset. Not a lab experiment. Real URLs. Real malicious links. Real results.

### The Chrome Extension — Your Browser's New Best Friend
Deployed as a Chrome extension so it works *where the threat actually is* — in your browser. No separate app to open, no URL to copy-paste into a checker. WACH is there before you click, not after you've already made the mistake.

Over **1,000 QR codes and URLs** scanned during testing. The extension held up. The bad links did not.

### QR Code Detection — The Threat Nobody's Talking About Enough
QR codes are the perfect crime scene. You can't hover over them to see the URL like you can with a link. You have no idea where they're sending you until you're already there. Cybercriminals love them precisely because they bypass your instinct to be careful.

WACH decodes the QR code, extracts the hidden URL, and runs it through the full AI pipeline before your camera has even finished focusing. It's the only thing standing between you and whatever that suspicious QR code on the lamppost actually leads to.

---

## Real Use Cases (From People Who Should Have Used WACH Sooner)

**The Office Worker**
Gets an email with a "Reset your password" link from what looks like their company IT portal. Clicks it. WACH flags it red before the page loads. Averts a corporate data breach. Gets a raise? Probably not. But deserves one.

**The Conference Attendee**
Scans a QR code on a sponsor banner. WACH detects the URL resolves to a known phishing domain. Doesn't scan it. Goes home with their credentials intact and a great story about the time AI saved them.

**The Online Shopper**
Receives an SMS: *"Your package is delayed. Track here: [link]"*. WACH detects it's a smishing URL designed to steal payment info. Deletes the message. Package arrives anyway because it was never delayed.

**The Small Business Owner**
Puts a QR code on their storefront for customers to pay. Uses WACH to first verify their own QR hasn't been tampered with (yes, attackers do replace legitimate QR stickers with malicious ones). Sleeps better at night.

**The Curious Person Who Scans Every QR Code They See**
(You know who you are.) Now scans every QR code they see, but with WACH running. Still curious. No longer compromised.

---

## Why 91.30% Accuracy Is Actually a Big Deal

Let's put this in perspective.

A human spotting a phishing URL by eye? Roughly **50-60% accuracy** under pressure, according to cybersecurity studies. We're bad at this. URLs are designed to deceive us — tiny misspellings, lookalike characters, deceptive subdomains.

WACH at **91.30%** beats the average human by a country mile — and it never gets tired, never rushes, and never clicks something accidentally because it was on its phone while walking.

And it gets there without any single model carrying the load. The stacking ensemble approach means if one model gets fooled by a cleverly crafted URL, the others catch it. It's peer review for machine learning. Science, basically.

---

## Why It's Actually Impressive

| Threat | Without WACH | With WACH |
|---|---|---|
| Phishing URLs | Hope you notice the typo | AI-flagged before you click |
| Malicious QR codes | No idea until it's too late | Decoded and checked instantly |
| Smishing links | Requires expert eye | 91.30% accuracy, no expertise needed |
| Zero-day phishing domains | Completely invisible | Pattern-based detection catches new variants |
| Your confidence online | Fragile | Justified |

---

## The Tech Stack (For the Nerds, in Full)

| Component | Technology |
|---|---|
| ML Framework | Scikit-learn |
| Base Models | Random Forest, MLP, KNN |
| Meta-Learner | Stacking Logistic Regression |
| Deployment | Chrome Extension |
| Dataset | Real-world URLs (malicious + benign) |
| Accuracy | 91.30% |
| QR Scans in Testing | 1,000+ |
| Year | 2025 |

No black box. No magic. Just well-engineered machine learning, properly stacked, properly tested, deployed where it actually matters.

---

## In Summary

The internet has a QR code problem. It has a phishing problem. It has a "trust nothing but click everything" human behaviour problem.

WACH solves it the right way — not by blocking everything (annoying) or trusting everything (dangerous), but by being **actually smart** about what's harmful and what isn't.

It combines four machine learning models into one ensemble that's smarter than any individual model, wraps it in a Chrome extension that requires zero effort from the user, and delivers a verdict before you've even had time to regret clicking.

It won't make cybercriminals disappear. Nothing can do that. But it will make sure that when they try to trick you, there's an AI standing at the door — checking IDs, cross-referencing the list, and turning away every suspicious URL before it gets anywhere near your data.

**Scan everything. Fear nothing.**

---

*Built with Scikit-learn, a healthy paranoia about QR codes, and the firm belief that 91.30% is not a ceiling — it's a starting point.*
