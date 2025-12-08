# Content Security Policy (CSP) Fixes

## Problem
Chrome extension was throwing CSP violations:
```
Executing inline event handler violates the following Content Security Policy directive 'script-src 'self''.
```

## Root Cause
The extension had inline event handlers (`onclick`, `onmouseover`, `onmouseout`) which violate Manifest V3's strict Content Security Policy that doesn't allow inline JavaScript execution.

## Violations Found & Fixed

### 1. **options.js** - Inline `onclick` handler
**Before:**
```javascript
container.innerHTML = trackedSites.map(
  (site) => `
    <button class="remove-btn" onclick="removeSiteFromList('${site}')">Remove</button>
  `
).join('');

window.removeSiteFromList = function (site) {
  removeSite(site);
};
```

**After:**
```javascript
container.innerHTML = trackedSites.map(
  (site) => `
    <button class="remove-btn" data-site="${site}">Remove</button>
  `
).join('');

// Add event listeners properly
container.querySelectorAll('.remove-btn').forEach((btn) => {
  btn.addEventListener('click', function () {
    const site = this.getAttribute('data-site');
    removeSite(site);
  });
});
```

### 2. **options.html** - Inline hover handlers
**Before:**
```html
<button
  id="resetTodayBtn"
  style="background: #ef4444; ..."
  onmouseover="this.style.background='#dc2626'"
  onmouseout="this.style.background='#ef4444'"
>
  Reset Today
</button>
```

**After:**
```html
<button id="resetTodayBtn" class="reset-today-btn">
  Reset Today
</button>
```

With CSS:
```css
.reset-today-btn {
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.reset-today-btn:hover {
  background: #dc2626;
}
```

## Best Practices Applied

1. ✅ **Use `data-*` attributes** instead of inline event handlers
2. ✅ **Use `addEventListener()`** for all event handling
3. ✅ **Use CSS `:hover`** for hover effects instead of JavaScript
4. ✅ **Event delegation** for dynamically created elements
5. ✅ **Separation of concerns** - keep HTML, CSS, and JS separate

## Testing
After reloading the extension:
1. ✅ No CSP errors in console
2. ✅ Remove site buttons work correctly
3. ✅ Reset button hover effect works
4. ✅ All functionality preserved

## Files Modified
- `/Users/gejun/Documents/chrome-extension/time-tracker-widget/options.js`
- `/Users/gejun/Documents/chrome-extension/time-tracker-widget/options.html`
