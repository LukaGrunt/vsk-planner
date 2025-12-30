# Profile Section Updates - Social Media Links Reorganization

## Task
Reorganize the profile section to:
1. Hide the English/Slovenian language toggle (keep code for future use)
2. Add 2 new buttons: Blog (Medium) and Website (VSK.si)
3. Rearrange layout: Facebook, Blog, Website in one row (3 columns), Support button below in its own row

## Plan

### Tasks
- [x] 1. Comment out/hide the language toggle section (lines 4955-4990)
- [x] 2. Add Medium blog button with Medium logo linking to https://medium.com/@strelskiklubvsk
- [x] 3. Add VSK website button linking to https://vsk.si/
- [x] 4. Create new 3-column grid layout for Facebook, Blog, and Website buttons
- [x] 5. Move Support button to its own row below the social media row
- [x] 6. Keep all changes simple - only modify the profile section layout

## Design
- **Row 1**: Facebook | Blog (Medium) | Website (3 columns, equal width)
- **Row 2**: Support (full width button)
- Each button maintains the glass card style
- Support button moves to where language toggle was
- Language toggle code remains but is commented out

## Notes
- Keep English translation code intact for future use
- Only modify the Slovenian UI display
- Maintain existing styling and icon patterns
- Simple, minimal changes to profile section only

## Review

### What Was Done
1. **Hidden language toggle**: Commented out the English/Slovenian toggle (lines 4955-4990) - code preserved for future use
2. **Added Blog button**: New Medium blog link with black gradient background and "M" icon
3. **Added Website button**: New VSK.si link with purple gradient background and globe emoji
4. **Reorganized layout**: Changed from 2-column to 3-column grid for social media links
5. **Repositioned Support**: Moved Support to full-width row below social media buttons

### Changes Made
- **Modified**: [src/App.jsx](src/App.jsx#L4955-L4990) - Language toggle section
  - Commented out entire language toggle div
  - Added note that code is preserved for future use

- **Modified**: [src/App.jsx](src/App.jsx#L5026-L5150) - Support & Social section
  - Changed grid from `1fr 1fr` (2 columns) to `1fr 1fr 1fr` (3 columns)
  - Reordered: Facebook first, then Blog, then Website
  - Moved Support button to separate full-width row below
  - Support button now horizontal layout (icon + text side by side)

### New Buttons
**Blog (Medium):**
- URL: https://medium.com/@strelskiklubvsk
- Icon: "M" letter in black gradient background (#000000 to #1a1a1a)
- Label: "Blog"

**Website (VSK):**
- URL: https://vsk.si/
- Icon: 🌐 globe emoji in purple gradient background (#6366f1 to #4f46e5)
- Label: "Website"

### Layout Changes
**Before:**
```
┌──────────────┬──────────────┐
│   Support    │   Facebook   │
└──────────────┴──────────────┘
```

**After:**
```
┌──────────┬──────────┬──────────┐
│ Facebook │   Blog   │ Website  │
└──────────┴──────────┴──────────┘
┌──────────────────────────────────┐
│            Support                │
└──────────────────────────────────┘
```

### Impact
- **Simplified UI**: Removed language toggle - app is now Slovenian-only
- **Better social presence**: Added Blog and Website links for more visibility
- **Improved layout**: 3 equal-width social buttons look balanced
- **Support prominence**: Full-width Support button is more visible and easier to tap
- **Code preserved**: Language toggle code intact for future multilingual support

### Technical Details
- All buttons maintain consistent glass card styling
- All external links use `target="_blank"` and `rel="noopener noreferrer"` for security
- Support button changed from vertical (icon above text) to horizontal (icon beside text) layout
- Button gradients follow existing color scheme patterns
- Grid gap remains 12px for consistent spacing

### Testing Notes
- Language remains set to Slovenian by default (language state still exists in code)
- All 4 links should open correctly (Facebook, Medium, VSK.si, mailto for Support)
- Layout should be responsive and buttons equally sized
- Icons should be centered and properly styled
