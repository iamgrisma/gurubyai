# SEO Implementation Guide

## ✅ What's Been Done

### 1. Installed React Helmet Async
```bash
npm install react-helmet-async
```

### 2. Created SEO Infrastructure

#### `/components/shared/SEO.tsx`
- Reusable SEO component
- Handles title, description, keywords
- Open Graph tags for social media
- Twitter Card tags
- Canonical URLs
- Geo-location meta tags

#### `/lib/seo-config.ts`
- Centralized SEO configurations
- Pre-configured meta tags for all pages
- Easy to maintain and update

### 3. Integrated into App
- Wrapped entire app with `<HelmetProvider>`
- Added SEO component to Landing Page

## 📝 Current SEO Status

### ✅ Pages with SEO
- **Home/Landing Page** - ✓ Complete with OG tags

### ⏳ Pages Needing SEO

Add the SEO component to these pages:

#### Public Pages (Should be indexed)
1. **Service Selection** (`/book`) - High priority for SEO
2. **Service Details** (`/services/:id`) - Dynamic SEO per service  
3. **Guruba Directory** (`/gurubas`) - High priority for SEO
4. **Login Page** (`/login`) - noindex  
5. **Register Page** (`/register`) - Indexed

#### Protected Pages (noindex)
6. **Client Dashboard** - noindex
7. **Guruba Dashboard** - noindex
8. **Admin Dashboard** - noindex
9. **Messages** - noindex
10. **Booking Success** - noindex

## 🚀 How to Add SEO to a Page

### Example 1: Simple Page (Login)

```tsx
import { SEO } from '../../components/shared/SEO';
import { PAGE_SEO } from '../../lib/seo-config';

export const LoginPage: React.FC = () => {
  return (
    <div>
      <SEO {...PAGE_SEO.login} />
      {/* Rest of your page */}
    </div>
  );
};
```

### Example 2: Dynamic Service Page

```tsx
import { SEO } from '../../components/shared/SEO';

export const ServiceDetailsPage: React.FC = () => {
  const { serviceId } = useParams();
  const { data: service } = useService(serviceId);

  return (
    <div>
      <SEO 
        title={service?.title}
        description={service?.description || `Book ${service?.title} with verified Gurubas`}
        keywords={`${service?.title}, ${service?.category}, puja booking, guruba nepal`}
        image={service?.image_url}
        url={`https://guruba.com/services/${serviceId}`}
      />
      {/* Rest of your page */}
    </div>
  );
};
```

### Example 3: Collection/List Page (Services)

```tsx
import { SEO } from '../../components/shared/SEO';
import { PAGE_SEO } from '../../lib/seo-config';

export const ServiceSelection: React.FC = () => {
  return (
    <div>
      <SEO {...PAGE_SEO.services} />
      {/* Service list */}
    </div>
  );
};
```

## 🎯 Priority Implementation Order

1. **High Priority (Public & Indexable)**
   - [ ] Service Selection (`/book`)
   - [ ] Guruba Directory (`/gurubas`)
   - [ ] Service Details (dynamic)
   - [ ] Register Page

2. **Medium Priority (Auth Pages)**
   - [ ] Login (noindex)

3. **Low Priority (Protected, noindex)**
   - [ ] All dashboards
   - [ ] Messages
   - [ ] Booking success

## 📊 SEO Benefits

### Before:
```html
<title>Guruba</title>
<meta name="description" content="..." />
<!-- Same for ALL pages -->
```

### After:
```html
<!-- Home Page -->
<title>Home | Guruba</title>
<meta name="description" content="Connect with experienced Gurubas for Pujas..." />

<!-- Services Page -->
<title>Our Services | Guruba</title>
<meta name="description" content="Browse our complete range of Vedic..." />

<!-- Each page gets unique meta tags! -->
```

## 🔍 SEO Features Included

✅ **Dynamic Titles** - Each page has unique title  
✅ **Meta Descriptions** - Unique descriptions per page  
✅ **Keywords** - Relevant keywords for each page  
✅ **Open Graph** - Social media previews (Facebook, LinkedIn)  
✅ **Twitter Cards** - Twitter-specific previews  
✅ **Canonical URLs** - Prevent duplicate content  
✅ **Noindex** - Protected pages won't be indexed  
✅ **Geo Tags** - Nepal targeting  

## 🌐 Social Media Preview

When someone shares your page:

**Before:** Generic "Guruba" with no image  
**After:** Beautiful preview with title, description, and image specific to that page

## 📱 Testing SEO

1. **In Browser:**
   - Check `<title>` in browser tab
   - View page source (Ctrl+U)
   - Look for meta tags in `<head>`

2. **SEO Tools:**
   - Google Search Console
   - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
   - Twitter Card Validator: https://cards-dev.twitter.com/validator

3. **Local Testing:**
   - Navigate to different pages
   - Browser tab title should change
   - View page source should show different meta tags

## 🚀 Next Steps

1. Add SEO to high-priority public pages (services, gurubas)
2. Test with social media debuggers
3. Submit sitemap to Google Search Console
4. Monitor search rankings

## 💡 Pro Tips

- Update `seo-config.ts` instead of hardcoding in components
- Use dynamic SEO for detail pages (services, guruba profiles)
- Set `noindex: true` for all protected/auth pages
- Include location keywords for local SEO
- Keep descriptions 150-160 characters
- Keep titles under 60 characters

## 🎨 Example: Adding SEO to Guruba Directory

```tsx
// features/public/GurubaDirectory.tsx

import { SEO } from '../../components/shared/SEO';
import { PAGE_SEO } from '../../lib/seo-config';

export const GurubaDirectory: React.FC = () => {
  return (
    <div>
      <SEO {...PAGE_SEO.gurubas} />
      
      {/* Your guruba list */}
    </div>
  );
};
```

That's it! Just 2 lines of code per page! 🎉
