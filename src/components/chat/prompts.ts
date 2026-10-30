/**
 * FRONTEND · components/chat/prompts.ts — the ready-made prompts the chat offers.
 *
 * "Today's deals" is the demo prompt: it needs the FlashDealCard you add on
 * /components (without it the assistant falls back to ProductCard).
 */
export const SUGGESTIONS = [
  { label: "Find products", text: "Show me 3 noise-cancelling headphones under $350, with price, rating and key specs" },
  { label: "Reviews", text: "What do buyers say about the Sony WH-1000XM6? Show the rating breakdown and a few quotes" },
  { label: "My cart", text: "Show my cart: Sony WH-1000XM6 $349 and a USB-C cable $9 x2, with shipping and total" },
  { label: "Today's deals", text: "Any flash deals on headphones today?" },
];

/** Follow-ups once a page exists. Layout edits make the AI switch to another approved layout. */
export const EDITS = ["Make it dark", "Add delivery details below", "Add a 4th product"];
export const LAYOUT_EDITS = ["Show the price first", "Put the verdict above the products", "Make it dark"];
