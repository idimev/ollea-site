# Ollea — How to put the site online and edit it yourself

Your site now has a free, click-based admin (Decap CMS). After a one-time setup you'll log in at
`https://your-site.netlify.app/admin/` and edit blog posts, the homepage text and contact details —
no code, ever. Everything is free for a site this size.

The design and pages are untouched. The admin only changes the content stored in the `content/` folder
and images in `images/uploads/`.

---

## What you can edit from the admin

- **Блог** → add, edit, reorder and delete blog posts (title, date, category, summary, cover image, full text with images).
- **Поставки → Почетна и контакт** → the homepage hero heading/subheading and your contact address, email and phone (updates the footer across all pages).

Anything structural (new section layouts, new page types) still comes back to me — that's normal for this kind of site.

---

## One-time setup (about 15 minutes, all free)

You'll create two free accounts: **GitHub** (stores the files) and **Netlify** (hosts the site and powers the login).

### 1. Put the project on GitHub
1. Create a free account at https://github.com
2. Click **New repository**, name it e.g. `ollea-site`, keep it **Public** or **Private**, click **Create**.
3. On the new repo page click **uploading an existing file**, then drag in **everything inside the `Ollea` folder**
   (the `index.html`, `admin/`, `css/`, `js/`, `content/`, `images/` … keep the same structure). Click **Commit changes**.

> Tip: if dragging folders is awkward in the browser, install **GitHub Desktop** (free) and drag the whole folder in once.

### 2. Host it on Netlify
1. Create a free account at https://netlify.com (choose **Sign up with GitHub** — easiest).
2. Click **Add new site → Import an existing project → GitHub**, and pick your `ollea-site` repo.
3. Leave **Build command** empty and **Publish directory** as the root (`/`). Click **Deploy**.
4. After a few seconds you get a live address like `https://random-name.netlify.app`. (You can rename it in **Site settings → Change site name**, or add your own domain like `ollea.mk` later.)

### 3. Turn on the login (Netlify Identity + Git Gateway)
1. In your Netlify site go to **Site configuration → Identity** (older menus call it just **Identity**) → **Enable Identity**.
2. Under **Registration**, set it to **Invite only** (so only you can log in).
3. Scroll to **Services → Git Gateway** → **Enable Git Gateway**.
4. Go to the **Identity** tab → **Invite users** → enter your email → **Send**.
5. Check your email, click the invite link, and set a password.

### 4. Start editing
- Open `https://your-site.netlify.app/admin/`
- Log in with the email/password you just set.
- Edit **Блог** or **Поставки**, click **Save**, then **Publish**. Your change is live in under a minute.

---

## How adding a blog post works

1. Go to **Блог → Блог постови**.
2. Scroll to **Постови** and click **Add Пост +**.
3. Fill in: Наслов (title), Категорија, Краток опис (the card preview text), Главна слика (upload a photo), and Содржина (the full article — you can add headings, bold text and images here).
4. (Optional) **URL слаг** — leave empty and it's generated from the title automatically.
5. Click **Save**, then **Publish**.

The new post appears automatically on `blog.html`, on the homepage "Од нашиот блог" section (latest 3), and at its own page `blog-post.html?slug=…`.

---

## Replacing the placeholder images

Right now the product, hero and team graphics are placeholder boxes drawn in the page. When you have real photos:
- **Blog images** → upload them right inside the admin (cover image + images in the article body).
- **Product / hero / team photos** → send them to me and I'll drop them into the design, or upload them to `images/` on GitHub and tell me which goes where.

---

## A note on local preview

When you open the files directly from your computer (double-click), the blog list will show the **placeholder example cards**, not the live data — that's just a browser security rule for local files. Once the site is on Netlify, the real posts load normally. So always check the **Netlify address** for the true result.

---

## Quick reference

- Live site: `https://your-site.netlify.app`
- Admin: `https://your-site.netlify.app/admin/`
- Blog content file: `content/blog.json` (managed for you by the admin)
- Homepage + contact: `content/settings.json` (managed for you by the admin)
- Uploaded images: `images/uploads/`

If anything in the setup gets stuck, tell me which step and what you see — I'll walk you through it.

---

## Orders (the "Нарачка" page)

The site has a **basket + order page** at `naracka.html`. Customers click **Додај** / **Додај во кошничка** on the products, the header shows a live **Кошничка (N)** count, and on the order page they review the basket (adjust quantities, remove items), then pay either **cash-on-delivery** or **by card**. The whole basket is submitted as a single order in the **Нарачка** field.

Card details are entered on **Halkbank's own secure page**, never on ollea.mk — the site never sees, transmits or stores a card number, so there is nothing sensitive stored on your side.

The basket is stored in the customer's own browser (no server needed). Products now come from a single source: **Производи** in the admin (the file `content/products.json`). Edit a product once — name, price, description, image, category — and it updates everywhere: the products list, the product page, and the basket totals.

### Seeing the orders
Order submissions are handled by **Netlify Forms** (built into your hosting, free up to 100 submissions/month):
1. In Netlify, open your site → **Forms** tab → form named **order**. Every submission appears there.
2. To get an email each time someone orders: **Forms → Form notifications → Add notification → Email notification**, and enter your email.

> Note: Netlify only registers the form after a normal deploy of the site (it scans the HTML). After the first deploy with `naracka.html`, submit one test order yourself to confirm it shows up in the Forms tab.

### Editing the delivery cost and payment text
Go to **Поставки → Почетна и контакт → Плаќање и достава**. Two of these fields are not just text — they decide what the customer is actually charged:

- **Цена за достава (ден.)** — added to every order below the threshold (currently 130).
- **Бесплатна достава над (ден.)** — at or above this subtotal, delivery is free (currently 1.500).

Change either one and both the basket total *and* the amount charged to the card update together. The **Текст за достава** field is the sentence shown to customers — update it to match if you change the numbers, since it is only text.

> Also fill in **Е-пошта** under Контакт. The Услови and Враќање pages show it as the address for complaints and returns, and it currently reads `[внесете е-пошта во админот]`.

---

## Card payments (Halkbank)

Cards are live through Halkbank's virtual POS. The flow: the customer fills the order form, the order is saved **first**, then they go to the bank's secure 3-D Secure page to enter the card. When the bank approves, they come back to a success page.

Because the order is saved before payment, you still get the name and address even if someone abandons or fails the payment — those simply arrive with no matching payment record.

### Seeing what was paid
Two forms appear under the **Forms** tab:

- **order** — every order, with the customer's details and a **Број на нарачка** (order number).
- **payment** — only *successful* card payments, with the same **Број на нарачка**, the amount, and the bank's authorisation code.

Match the two by order number. Add an email notification on **payment** as well (**Forms → Form notifications**) so a paid order can't slip past you.

> Note: Netlify's free plan includes 100 form submissions per month, and a card order uses two (order + payment). If you start getting close, tell me and we'll move the notifications off Netlify Forms.

### The bank credentials
These live **only** in Netlify (**Site configuration → Environment variables**), never in the code: `HALKBANK_CLIENT_ID`, `HALKBANK_STORE_KEY`, `HALKBANK_GATE_URL`, `SITE_URL`. The storekey is marked secret and can't be read back — keep the bank's email.

### Going from test to live
The site currently points at Halkbank's **test** system, so no real money moves. When the bank issues production credentials, update those variables in Netlify and redeploy — no code changes. Tell me and I'll walk you through it.

### If a payment goes wrong
**Logs → Functions** in Netlify shows every attempt: `Payment initiated`, then `Payment approved` or `Payment failed` with the bank's reason. A `HASH mismatch` line means the storekey is wrong or has a stray space.
