# OnePic

OnePic is a lightweight mobile-friendly tool for combining multiple images into a single long image.

Users can pick several images at once, keep adding more, reorder them, remove any image they no longer want, and export the final result in a format that fits their needs.

## What It Does

- Select multiple images in one go
- Keep adding more images after the initial selection
- Merge images vertically on a single canvas
- Automatically use the smallest source width as the export baseline
- Scale down wider images proportionally without enlarging narrower ones
- Reorder images with simple up/down controls
- Confirm image deletion before removing an item
- Export the merged result as:
  - PNG
  - JPEG
  - PDF with either embedded PNG or embedded JPEG

## Export Behavior

- The on-screen canvas is scaled to fit the viewport, so the page stays easy to use on mobile and does not introduce horizontal scrolling.
- Exports use the canvas's actual pixel dimensions rather than the visually scaled size, which helps preserve clarity.
- PDF export uses an A4-based page width and supports choosing the embedded image format depending on whether you want better detail retention or a smaller file.

## Local Development

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- Next.js
- React
- TypeScript
- pdf-lib
- lucide-react
