-- ============================================================================
-- RESTAURANT MANAGEMENT & POS SYSTEM - DISH IMAGES SEED MIGRATION
-- Migration: 009_seed_dish_images.sql
-- Description: Idempotently populates local studio 3D food image paths
--              from /images/3d/ across core seed items and category-matched dishes,
--              and bumps menu_versions so cached POS terminals refresh immediately.
-- ============================================================================

-- 1. Explicit Seed Menu Item Images (Case-Insensitive Matching, overwrites stale/null URLs)
UPDATE menu_items
SET image_url = '/images/3d/food-curry-3d.jpg'
WHERE id = '30000000-0000-0000-0000-000000000001'
   OR name ILIKE '%Fried Rice%';

UPDATE menu_items
SET image_url = '/images/3d/food-burger-3d.jpg'
WHERE id = '30000000-0000-0000-0000-000000000002'
   OR name ILIKE '%Burger%';

UPDATE menu_items
SET image_url = '/images/3d/food-latte-3d.jpg'
WHERE id = '30000000-0000-0000-0000-000000000003'
   OR name ILIKE '%Coffee%';

UPDATE menu_items
SET image_url = '/images/3d/food-feast-3d.svg'
WHERE id = '30000000-0000-0000-0000-000000000004'
   OR name ILIKE '%Lava Cake%';

-- 2. Category-Matched Assignment for remaining dishes
-- Rice, Biryani, Pasta, Curry & Noodles -> food-curry-3d.jpg
UPDATE menu_items
SET image_url = '/images/3d/food-curry-3d.jpg'
WHERE name ILIKE '%rice%'
   OR name ILIKE '%biryani%'
   OR name ILIKE '%nasi%'
   OR name ILIKE '%noodle%'
   OR name ILIKE '%pasta%'
   OR name ILIKE '%kottu%'
   OR name ILIKE '%curry%';

-- Burgers, Grills, BBQ, Steak & Sandwiches -> food-burger-3d.jpg
UPDATE menu_items
SET image_url = '/images/3d/food-burger-3d.jpg'
WHERE name ILIKE '%burger%'
   OR name ILIKE '%grill%'
   OR name ILIKE '%bbq%'
   OR name ILIKE '%steak%'
   OR name ILIKE '%sandwich%'
   OR name ILIKE '%wrap%'
   OR name ILIKE '%wings%';

-- Beverages, Coffee, Shakes, Teas & Juices -> food-latte-3d.jpg
UPDATE menu_items
SET image_url = '/images/3d/food-latte-3d.jpg'
WHERE name ILIKE '%coffee%'
   OR name ILIKE '%latte%'
   OR name ILIKE '%tea%'
   OR name ILIKE '%juice%'
   OR name ILIKE '%shake%'
   OR name ILIKE '%smoothie%'
   OR name ILIKE '%mojito%'
   OR name ILIKE '%beverage%'
   OR name ILIKE '%soda%'
   OR name ILIKE '%drink%';

-- Desserts, Cakes, Ice Cream & Sweets -> food-feast-3d.svg
UPDATE menu_items
SET image_url = '/images/3d/food-feast-3d.svg'
WHERE name ILIKE '%cake%'
   OR name ILIKE '%dessert%'
   OR name ILIKE '%pudding%'
   OR name ILIKE '%ice cream%'
   OR name ILIKE '%waffle%'
   OR name ILIKE '%sweet%'
   OR name ILIKE '%brownie%'
   OR name ILIKE '%combo%';

-- Catch-all for any remaining items without photos
UPDATE menu_items
SET image_url = '/images/3d/food-feast-3d.svg'
WHERE image_url IS NULL OR image_url = '';

-- 3. Bump menu_versions so cached Zustand POS clients auto-invalidate and reload images
UPDATE menu_versions
SET version_number = version_number + 1,
    updated_at = TIMEZONE('utc', NOW());
