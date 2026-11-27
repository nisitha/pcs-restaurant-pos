-- ============================================================================
-- RESTAURANT MANAGEMENT & POS SYSTEM - DISH IMAGES SEED MIGRATION
-- Migration: 009_seed_dish_images.sql
-- Description: Idempotently populates realistic, high-resolution food photo URLs
--              for core seed menu items and category-matched dishes where image_url IS NULL.
-- ============================================================================

-- 1. Explicit Seed Menu Item Images
UPDATE menu_items
SET image_url = 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'
WHERE id = '30000000-0000-0000-0000-000000000001'
   OR (name ILIKE '%Chicken Fried Rice%' AND (image_url IS NULL OR image_url = ''));

UPDATE menu_items
SET image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'
WHERE id = '30000000-0000-0000-0000-000000000002'
   OR (name ILIKE '%Beef Burger Deluxe%' AND (image_url IS NULL OR image_url = ''));

UPDATE menu_items
SET image_url = 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80'
WHERE id = '30000000-0000-0000-0000-000000000003'
   OR (name ILIKE '%Iced Coffee%' AND (image_url IS NULL OR image_url = ''));

UPDATE menu_items
SET image_url = 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80'
WHERE id = '30000000-0000-0000-0000-000000000004'
   OR (name ILIKE '%Chocolate Lava Cake%' AND (image_url IS NULL OR image_url = ''));

-- 2. Category-Matched Fallback for remaining custom dishes where image_url is missing
-- Rice, Biryani, Pasta & Noodles
UPDATE menu_items
SET image_url = 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'
WHERE (image_url IS NULL OR image_url = '')
  AND (
      name ILIKE '%rice%' OR 
      name ILIKE '%biryani%' OR 
      name ILIKE '%nasi%' OR 
      name ILIKE '%noodle%' OR 
      name ILIKE '%pasta%' OR 
      name ILIKE '%kottu%'
  );

-- Burgers, Grills, BBQ, Chicken & Steaks
UPDATE menu_items
SET image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'
WHERE (image_url IS NULL OR image_url = '')
  AND (
      name ILIKE '%burger%' OR 
      name ILIKE '%grill%' OR 
      name ILIKE '%bbq%' OR 
      name ILIKE '%steak%' OR 
      name ILIKE '%sandwich%' OR 
      name ILIKE '%wrap%' OR 
      name ILIKE '%wings%' OR 
      name ILIKE '%chicken%'
  );

-- Beverages, Coffee, Shakes, Teas & Juices
UPDATE menu_items
SET image_url = 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80'
WHERE (image_url IS NULL OR image_url = '')
  AND (
      name ILIKE '%coffee%' OR 
      name ILIKE '%tea%' OR 
      name ILIKE '%juice%' OR 
      name ILIKE '%shake%' OR 
      name ILIKE '%smoothie%' OR 
      name ILIKE '%mojito%' OR 
      name ILIKE '%beverage%' OR 
      name ILIKE '%soda%' OR 
      name ILIKE '%drink%'
  );

-- Desserts, Cakes, Ice Cream & Sweets
UPDATE menu_items
SET image_url = 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80'
WHERE (image_url IS NULL OR image_url = '')
  AND (
      name ILIKE '%cake%' OR 
      name ILIKE '%dessert%' OR 
      name ILIKE '%pudding%' OR 
      name ILIKE '%ice cream%' OR 
      name ILIKE '%waffle%' OR 
      name ILIKE '%sweet%' OR 
      name ILIKE '%brownie%'
  );

-- Catch-all for any remaining items without photos (Appetizer / Chef Special platter)
UPDATE menu_items
SET image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'
WHERE (image_url IS NULL OR image_url = '');
