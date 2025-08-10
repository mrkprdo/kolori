# Kolori - WLED UI

### Development

```bash
# Start development server ( http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features Included

✅ **Modern UI with Tailwind CSS**

- Responsive design
- Dark/Light mode support
- Beautiful gradient cards
- Smooth animations

✅ **LED Control Features**

- Seasonal presets (Halloween, Christmas, etc.)
- Color theme presets (Sunset, Ocean, etc.)
- Device management
- Playlist builder
- Scheduler functionality

## Production Build

The `npm run build` command creates optimized files in the `dist/` directory:

- **Minified JavaScript and CSS**
- **Optimized images and assets**
- **Gzipped for faster loading**
- **Source maps disabled for security**

## Environment Configuration

For different environments, you can create `.env` files:

```bash
# .env.local
VITE_API_URL=http://localhost:8080
VITE_APP_TITLE=Kolori Development

# .env.production
VITE_API_URL=https://api.yourdomain.com
VITE_APP_TITLE=Kolori
```
