# V-Farms platform

Exclusive whole-property stays and private events for a five-acre dragon fruit farm near Hyderabad.

**V-Farms is one property-wide booking inventory for both stays and events. Guests cannot book individual rooms.**

## Quick start

```bash
npm install
copy .env.example apps\web\.env.local
npm run dev
```

Website: http://localhost:3000  
Staff: http://localhost:3000/admin  
Android: open `apps/android` in Android Studio (JDK 17 + SDK required).

## Commands

| Command | Purpose |
| `npm run dev` | Next.js website + APIs |
| `npm run test` | Inventory + web unit tests |
| `npm run typecheck` | TypeScript |
| `npm run lint` | Next lint |
| `npm run build` | Production website build |
| `npm run test:e2e` | Playwright (needs browsers) |
| `npm run android:assemble` | Debug APK (needs Android SDK) |

## Media

Genuine source video: `apps/web/public/videos/vfarms-resort.mp4`  
Enhanced frames: `apps/web/public/images/estate/vfarms_4k_hdr_style_01.jpg` … `_12.jpg`  
The contact sheet is **not** used as a gallery image.

## Docs

- [Architecture](docs/architecture.md)
- [Setup](docs/setup.md)
- [Deployment](docs/deployment.md)
- [Owner decisions](docs/owner-decisions.md)
- PRD: `docs/V-Farms_Complete_MVP_PRD_Whole_Resort_Stays_and_Events.pdf`
