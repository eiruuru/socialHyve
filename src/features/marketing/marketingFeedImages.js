/** Demo feed images for marketing mockups (generated assets). */
export const MARKETING_FEED_IMAGES = {
  brunch: '/marketing/feed/feed-brunch.jpg',
  latte: '/marketing/feed/feed-latte.jpg',
  retail: '/marketing/feed/feed-retail.jpg',
  dessert: '/marketing/feed/feed-dessert.jpg',
  interior: '/marketing/feed/feed-interior.jpg',
  event: '/marketing/feed/feed-event.jpg',
};

/** @returns {string} image URL for grid index 0-8 */
export function gridFeedImage(index) {
  const order = [
    MARKETING_FEED_IMAGES.interior,
    MARKETING_FEED_IMAGES.latte,
    MARKETING_FEED_IMAGES.retail,
    MARKETING_FEED_IMAGES.dessert,
    MARKETING_FEED_IMAGES.brunch,
    MARKETING_FEED_IMAGES.event,
    MARKETING_FEED_IMAGES.latte,
    MARKETING_FEED_IMAGES.interior,
    MARKETING_FEED_IMAGES.dessert,
  ];
  return order[index] ?? MARKETING_FEED_IMAGES.brunch;
}

export function demoMedia(url) {
  return [{ public_url: url, mime_type: 'image/jpeg' }];
}
