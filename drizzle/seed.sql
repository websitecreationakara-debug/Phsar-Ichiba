-- Demo catalog data for local development so the storefront UI isn't empty.
-- Safe to re-run: each INSERT uses fixed ids and OR IGNORE.

INSERT OR IGNORE INTO categories (id, name, slug, image_url, parent_id, created_at) VALUES
  ('4755e038-f482-4e07-ad81-3c6c0cc0aaea',   'Fresh Vegetables', 'vegetables',    NULL, NULL, '2026-07-01T00:00:00.000Z'),
  ('7ece7cb8-7cf1-46a8-8222-96f19096e88c',       'Fresh Fruits',     'fruits',        NULL, NULL, '2026-07-01T00:00:00.000Z'),
  ('9aa9d485-65ac-4b43-b3af-e3dd64b244ee',        'Herbs & Spices',   'herbs-spices',  NULL, NULL, '2026-07-01T00:00:00.000Z'),
  ('612033b3-2092-49aa-93b3-d8240243eb16',        'Dairy & Eggs',     'dairy-eggs',    NULL, NULL, '2026-07-01T00:00:00.000Z'),
  ('82cafe30-5c83-42c0-8a95-4de8ca538894',         'Meat & Seafood',   'meat-seafood',  NULL, NULL, '2026-07-01T00:00:00.000Z'),
  ('d2d053aa-5b89-43d6-881c-a6f603639370',       'Rice & Grains',    'rice-grains',   NULL, NULL, '2026-07-01T00:00:00.000Z'),
  ('13be1d33-face-44e8-900e-97597bd882d2',    'Beverages',        'beverages',     NULL, NULL, '2026-07-01T00:00:00.000Z'),
  ('891026ed-7a90-4baf-9457-4462ff61c063',       'Snacks & Sweets',  'snacks-sweets', NULL, NULL, '2026-07-01T00:00:00.000Z');

INSERT OR IGNORE INTO hero_slides (id, eyebrow, title_top, title_accent, title_bottom, body, image_url, cta_label, cta_link, sort_order, active, created_at) VALUES
  ('9611d9e5-a0a7-4a34-a957-a8fa674cf443', 'Fresh from the farm', 'Today''s pick,', 'straight from the market', 'to your door.', 'Hand-picked vegetables and fruit, sourced daily from local growers. Order before 6pm for same-day delivery.', NULL, 'Shop fresh produce', '/shop?category=vegetables', 0, 1, '2026-07-01T00:00:00.000Z'),
  ('d5224002-332e-4cc5-9c21-a29a6a879648', 'This week only', 'Stock up and', 'save 20%', 'on seasonal fruit.', 'Mangoes, dragon fruit, and rambutan are in season — grab them while they last.', NULL, 'View the offer', '/shop?category=fruits', 1, 1, '2026-07-01T00:00:00.000Z'),
  ('1aadbebb-6ef9-4128-bdcf-bad38c1aa244', 'New in store', 'Everything for', 'tonight''s dinner', 'in one basket.', 'Fresh herbs, rice, and pantry staples alongside your vegetables — one delivery, one basket.', NULL, 'Browse the market', '/shop', 2, 1, '2026-07-01T00:00:00.000Z');

INSERT OR IGNORE INTO store_settings (id, banner_text, global_discount_pct, free_shipping_threshold, updated_at) VALUES
  ('335ea3b2-c242-468f-8a0a-14b40809c106', 'Free delivery on orders over $30 — order before 6pm for same-day delivery.', 0, 30, '2026-07-01T00:00:00.000Z');

INSERT OR IGNORE INTO products (id, title, description, price, sale_price, category_id, stock, status, image_url, badge, rating, weight, pcs, type, sort_order, promotion_id, created_at, updated_at) VALUES
  ('5d25a104-bd97-4a7e-a040-0925e5e3477a', 'Cherry Tomatoes', 'Sweet, sun-ripened cherry tomatoes, picked at peak flavor.', 3.5, NULL, '4755e038-f482-4e07-ad81-3c6c0cc0aaea', 42, 'published', NULL, 'Fresh', 4.7, '250g', NULL, 'simple', 0, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('9e401b88-1996-41d6-9e58-09224c1aa6da', 'Baby Carrots', 'Crisp, sweet baby carrots — great for snacking or roasting.', 2.2, NULL, '4755e038-f482-4e07-ad81-3c6c0cc0aaea', 60, 'published', NULL, NULL, 4.5, '500g', NULL, 'simple', 1, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('fc158cbf-d775-4e1b-b64a-15a154a9eed8', 'Broccoli Crown', 'Firm, deep-green broccoli crowns rich in vitamin C.', 2.8, 2.3, '4755e038-f482-4e07-ad81-3c6c0cc0aaea', 25, 'published', NULL, 'Sale', 4.6, '1 head', NULL, 'simple', 2, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('200e0e78-5b8d-493a-a143-769e9b86c353', 'Baby Spinach', 'Tender baby spinach leaves, washed and ready to cook.', 2.5, NULL, '4755e038-f482-4e07-ad81-3c6c0cc0aaea', 30, 'published', NULL, NULL, 4.4, '200g', NULL, 'simple', 3, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('df8d7036-5d77-4117-ad7d-ea09ffc94508', 'Rainbow Bell Peppers', 'A mix of red, yellow, and green bell peppers.', 4.0, NULL, '4755e038-f482-4e07-ad81-3c6c0cc0aaea', 20, 'published', NULL, 'Hot', 4.8, '3 pcs', 3, 'simple', 4, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('792b7f8e-e86c-48ad-a556-c6cd5d37cd7d', 'Japanese Cucumber', 'Crunchy, thin-skinned cucumbers, perfect for salads.', 1.8, NULL, '4755e038-f482-4e07-ad81-3c6c0cc0aaea', 0, 'published', NULL, NULL, 4.3, '3 pcs', 3, 'simple', 5, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),

  ('53714b6c-329f-4f85-9218-1343d5954b35', 'Ripe Mango', 'Sweet, fragrant mangoes at peak ripeness.', 4.5, NULL, '7ece7cb8-7cf1-46a8-8222-96f19096e88c', 35, 'published', NULL, 'Fresh', 4.9, '1kg', NULL, 'simple', 0, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('75781c94-e699-4df0-8854-18c968409e81', 'Dragon Fruit', 'Vivid pink dragon fruit with a mildly sweet, refreshing taste.', 3.2, 2.6, '7ece7cb8-7cf1-46a8-8222-96f19096e88c', 22, 'published', NULL, 'Sale', 4.5, '1 pc', 1, 'simple', 1, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('d71b6dc7-b65f-4db9-9a16-ddc6f1ae9402', 'Rambutan', 'Juicy, lychee-like rambutan, in season now.', 3.8, NULL, '7ece7cb8-7cf1-46a8-8222-96f19096e88c', 18, 'published', NULL, 'Hot', 4.7, '500g', NULL, 'simple', 2, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('b614fdb1-50c1-4a8e-8292-af07441a0bf5', 'Lady Finger Bananas', 'Small, sweet bananas — a local favorite.', 1.5, NULL, '7ece7cb8-7cf1-46a8-8222-96f19096e88c', 50, 'published', NULL, NULL, 4.4, '1kg', NULL, 'simple', 3, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('fa2bfb87-679c-4358-a229-e3e56ba245ac', 'Pomelo', 'Large, juicy pomelo with a mild, sweet-tart flavor.', 3.0, NULL, '7ece7cb8-7cf1-46a8-8222-96f19096e88c', 15, 'published', NULL, NULL, 4.6, '1 pc', 1, 'simple', 4, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),

  ('2e33e1b2-fd3a-4fb8-b107-1422a5c54ea5', 'Thai Basil', 'Aromatic Thai basil, freshly cut.', 1.2, NULL, '9aa9d485-65ac-4b43-b3af-e3dd64b244ee', 40, 'published', NULL, NULL, 4.6, '50g', NULL, 'simple', 0, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('1d3dd05b-3c28-4a36-8b0c-dea59521a882', 'Fresh Ginger Root', 'Pungent, aromatic ginger root.', 1.6, NULL, '9aa9d485-65ac-4b43-b3af-e3dd64b244ee', 33, 'published', NULL, NULL, 4.5, '250g', NULL, 'simple', 1, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('bcd65413-cc4b-4dce-8012-90769e92b60f', 'Garlic Bulbs', 'Firm, flavorful garlic bulbs.', 1.4, NULL, '9aa9d485-65ac-4b43-b3af-e3dd64b244ee', 45, 'published', NULL, NULL, 4.4, '200g', NULL, 'simple', 2, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('e6ea4e50-60c9-444d-96f1-7c35d156b6fa', 'Bird''s Eye Chili', 'Small, fiery chili peppers.', 1.0, NULL, '9aa9d485-65ac-4b43-b3af-e3dd64b244ee', 28, 'published', NULL, 'Hot', 4.3, '100g', NULL, 'simple', 3, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),

  ('5978a376-f5fa-4ca0-9d75-e42f0a7735a8', 'Farm Eggs', 'Free-range eggs from local farms.', 3.0, NULL, '612033b3-2092-49aa-93b3-d8240243eb16', 40, 'published', NULL, 'Fresh', 4.8, '12 pcs', 12, 'simple', 0, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('4139ea6f-fd8b-48e4-b9ab-57e4569fc86a', 'Fresh Milk', 'Pasteurized whole milk.', 2.5, NULL, '612033b3-2092-49aa-93b3-d8240243eb16', 30, 'published', NULL, NULL, 4.5, '1L', NULL, 'simple', 1, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('b20d36d1-6fa8-4cc1-b6c4-bd8d6f249175', 'Plain Yogurt', 'Creamy, tangy plain yogurt.', 2.2, NULL, '612033b3-2092-49aa-93b3-d8240243eb16', 25, 'published', NULL, NULL, 4.4, '500g', NULL, 'simple', 2, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('20bbadb0-bea3-401b-a6de-0d9207f4180d', 'Butter Block', 'Rich, creamy butter.', 4.2, NULL, '612033b3-2092-49aa-93b3-d8240243eb16', 20, 'published', NULL, NULL, 4.6, '250g', NULL, 'simple', 3, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),

  ('96b0b805-0dfe-40ed-94b8-93a113dbdaa9', 'Chicken Breast', 'Boneless, skinless chicken breast.', 6.5, NULL, '82cafe30-5c83-42c0-8a95-4de8ca538894', 18, 'published', NULL, NULL, 4.5, '500g', NULL, 'simple', 0, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('c3b7503e-8c60-4112-ac24-fce3c1724b4c', 'Beef Sirloin', 'Tender, well-marbled beef sirloin.', 9.8, 8.5, '82cafe30-5c83-42c0-8a95-4de8ca538894', 12, 'published', NULL, 'Sale', 4.7, '500g', NULL, 'simple', 1, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('2df31c78-a91a-4f39-ba7f-4c67179f82bb', 'Fresh Shrimp', 'Wild-caught shrimp, cleaned and deveined.', 8.0, NULL, '82cafe30-5c83-42c0-8a95-4de8ca538894', 15, 'published', NULL, 'Hot', 4.8, '400g', NULL, 'simple', 2, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('c8143e92-4cfc-47a4-bcb8-05a126c8bb8f', 'Salmon Fillet', 'Rich, buttery salmon fillet.', 11.5, NULL, '82cafe30-5c83-42c0-8a95-4de8ca538894', 10, 'published', NULL, NULL, 4.9, '300g', NULL, 'simple', 3, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),

  ('5c8888ab-fd3b-49b3-84dc-7dea25c2198f', 'Jasmine Rice', 'Fragrant, long-grain jasmine rice.', 7.5, NULL, 'd2d053aa-5b89-43d6-881c-a6f603639370', 50, 'published', NULL, 'Fresh', 4.8, '5kg', NULL, 'simple', 0, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('f56f006f-b339-4f18-a3da-97822d2c4a43', 'Rice Noodles', 'Thin, delicate rice noodles.', 2.0, NULL, 'd2d053aa-5b89-43d6-881c-a6f603639370', 35, 'published', NULL, NULL, 4.4, '400g', NULL, 'simple', 1, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('a3c8ee00-d1e0-48ec-ac44-e8afb08f00a8', 'Rolled Oats', 'Wholesome rolled oats for breakfast.', 3.4, NULL, 'd2d053aa-5b89-43d6-881c-a6f603639370', 28, 'published', NULL, NULL, 4.5, '1kg', NULL, 'simple', 2, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),

  ('f88110de-eab1-439a-80df-9a066c26a128', 'Coconut Water', 'Naturally sweet, hydrating coconut water.', 1.8, NULL, '13be1d33-face-44e8-900e-97597bd882d2', 40, 'published', NULL, NULL, 4.6, '1L', NULL, 'simple', 0, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('995fd30d-e51f-46ca-a740-209f877431a8', 'Green Tea Leaves', 'Fragrant loose-leaf green tea.', 4.5, NULL, '13be1d33-face-44e8-900e-97597bd882d2', 22, 'published', NULL, NULL, 4.7, '200g', NULL, 'simple', 1, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('c7b1a340-1597-4410-aa1d-247dd48be1b0', 'Fresh Orange Juice', 'Cold-pressed, no added sugar.', 3.6, 3.0, '13be1d33-face-44e8-900e-97597bd882d2', 18, 'published', NULL, 'Sale', 4.5, '1L', NULL, 'simple', 2, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),

  ('0da5368c-aa58-4db2-9255-0edad690fb5e', 'Dried Mango Slices', 'Chewy, naturally sweet dried mango.', 3.2, NULL, '891026ed-7a90-4baf-9457-4462ff61c063', 30, 'published', NULL, 'Hot', 4.6, '150g', NULL, 'simple', 0, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('cd54e096-1b10-4e87-8a1a-322f980f484f', 'Roasted Cashews', 'Lightly salted, roasted cashews.', 5.5, NULL, '891026ed-7a90-4baf-9457-4462ff61c063', 25, 'published', NULL, NULL, 4.7, '250g', NULL, 'simple', 1, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
  ('8bc8d83d-f720-4785-ab59-242f239f193b', 'Wildflower Honey', 'Raw, unfiltered wildflower honey.', 6.0, NULL, '891026ed-7a90-4baf-9457-4462ff61c063', 20, 'published', NULL, 'Fresh', 4.9, '350g', NULL, 'simple', 2, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z');
