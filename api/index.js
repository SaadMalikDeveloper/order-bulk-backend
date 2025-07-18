const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 4000;

const API_TOKEN = "oqcoyjkikh8uyoczab4lsdksen36psp";
const API_AUTH_CLIENT = "cpy17xvjru37a8v9y903r4lqws6awx0";
const BASE_URL = "https://api.bigcommerce.com/stores/afh0vnr9h0/v3/catalog";

const headers = {
  "X-Auth-Token": API_TOKEN,
  Accept: "application/json",
  "Content-Type": "application/json",
};

app.use(cors());

/**
 * Route 1: Get All Products (no variants)
 */
app.get("/api/products", async (req, res) => {
  let allProducts = [];
  let page = 1;
  const limit = 50;

  try {
    while (true) {
      const response = await axios.get(
        `${BASE_URL}/products?limit=${limit}&page=${page}`,
        {
          headers,
        }
      );

      const products = response.data.data;
      allProducts = allProducts.concat(products);

      if (!response.data.meta?.pagination?.links?.next) break;
      page++;
    }

    res.json({
      total: allProducts.length,
      products: allProducts,
    });
  } catch (err) {
    console.error(
      "Error fetching products:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/**
 * Route 2: Get Variants for a Specific Product
 */
app.get("/api/products/:id/variants", async (req, res) => {
  const productId = req.params.id;

  try {
    // Step 1: Fetch product options (to get color data)
    const optionsRes = await axios.get(
      `${BASE_URL}/products/${productId}/options`,
      { headers }
    );

    const optionValuesMap = {};

    // Build a map of option_value_id -> color hex
    optionsRes.data.data.forEach((option) => {
      option.option_values.forEach((value) => {
        if (value.value_data?.colors?.length) {
          optionValuesMap[value.id] = {
            label: value.label,
            color: value.value_data.colors[0],
          };
        }
      });
    });

    // Step 2: Fetch variants
    const variantsRes = await axios.get(
      `${BASE_URL}/products/${productId}/variants`,
      { headers }
    );

    const variantsWithColor = variantsRes.data.data.map((variant) => {
      const optionValuesWithColors = variant.option_values.map((ov) => {
        return {
          ...ov,
          color: optionValuesMap[ov.id]?.color || null,
        };
      });

      return {
        ...variant,
        option_values: optionValuesWithColors,
      };
    });

    res.json({
      product_id: productId,
      total: variantsWithColor.length,
      variants: variantsWithColor,
    });
  } catch (err) {
    console.error(
      `Error fetching variants for product ${productId}:`,
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Failed to fetch variants" });
  }
});

/**
 * Route 3: Create a Cart (with selected items)
 */
app.use(express.json()); // Ensure body parser is enabled for JSON

app.post("/api/create-cart", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.bigcommerce.com/stores/afh0vnr9h0/v3/carts",
      {
        line_items: req.body.line_items,
        channel_id: 1,
      },
      { headers }
    );

    const cart = response.data?.data;
    let redirect_url = cart.redirect_url;

    // Fallback redirect_url
    if (!redirect_url && cart?.id) {
      redirect_url = `https://store-afh0vnr9h0.mybigcommerce.com/cart.php?action=load&id=${cart.id}`;
    }

    res.json({
      ...response.data,
      redirect_url,
    });
    console.log(redirect_url);
  } catch (err) {
    console.error("Cart creation error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create cart" });
  }
});

app.get("/api/warehouse-items", async (req, res) => {
  try {
    // Step 1: Fetch all warehouse locations
    const locationsRes = await axios.get(
      `https://api.bigcommerce.com/stores/afh0vnr9h0/v3/inventory/locations`,
      { headers }
    );
    const locations = locationsRes.data.data;

    const results = [];

    // Step 2: For each location, fetch items
    for (const location of locations) {
      const itemsRes = await axios.get(
        `https://api.bigcommerce.com/stores/afh0vnr9h0/v3/inventory/locations/${location.id}/items`,
        {
          headers,
        }
      );

      results.push({
        warehouse_id: location.id,
        warehouse_label: location.label,
        items: itemsRes.data.data,
      });
    }

    // Step 3: Return grouped data
    res.json({ warehouses: results });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch warehouse items" });
  }
});

/*
 *  code for the variant with inventory
 */

app.get("/api/products/:id/variants-with-inventory", async (req, res) => {
  const productId = req.params.id;

  try {
    // Step 1: Fetch product options (to get color data)
    const optionsRes = await axios.get(
      `${BASE_URL}/products/${productId}/options`,
      { headers }
    );

    const optionValuesMap = {};
    optionsRes.data.data.forEach((option) => {
      option.option_values.forEach((value) => {
        if (value.value_data?.colors?.length) {
          optionValuesMap[value.id] = {
            label: value.label,
            color: value.value_data.colors[0],
          };
        }
      });
    });

    // Step 2: Fetch variants
    const variantsRes = await axios.get(
      `${BASE_URL}/products/${productId}/variants?page=1&limit=250`,
      { headers }
    );
    const variants = variantsRes.data.data;

    // Step 3: Fetch all warehouse inventory data
    const locationsRes = await axios.get(
      `https://api.bigcommerce.com/stores/afh0vnr9h0/v3/inventory/locations`,
      { headers }
    );
    const locations = locationsRes.data.data;

    const warehouseItems = [];
    for (const location of locations) {
      const itemsRes = await axios.get(
        `https://api.bigcommerce.com/stores/afh0vnr9h0/v3/inventory/locations/${location.id}/items`,
        { headers }
      );
      const items = itemsRes.data.data;

      items.forEach((item) => {
        // console.log("item>>>>>>>>>>>", item);
        // console.log("available_to_sell>>>>>>>>>>>", item.available_to_sell);
        warehouseItems.push({
          warehouse_id: location.id,
          warehouse_label: location.label,
          variant_id: item.identity.variant_id,
          stock_level: item.available_to_sell,
          sku_inventory: item.identity.sku,
        });
      });
    }

    // Step 4: Merge inventory into each variant
    const enrichedVariants = variants.map((variant) => {
      const optionValuesWithColors = variant.option_values.map((ov) => ({
        ...ov,
        label: optionValuesMap[ov.id]?.label || ov.label,
        color: optionValuesMap[ov.id]?.color || null,
      }));
      // console.log(warehouseItems);
      const inventory_by_warehouse = warehouseItems
        .filter((item) => item.variant_id === variant.id)
        .map((item) => ({
          warehouse_id: item.warehouse_id,
          warehouse_label: item.warehouse_label,
          stock_level: item.stock_level,
          sku_inventory: item.sku_inventory,
        }));

      return {
        ...variant,
        option_values: optionValuesWithColors,
        inventory_by_warehouse,
      };
    });

    res.json({
      product_id: productId,
      total: enrichedVariants.length,
      variants: enrichedVariants,
    });
  } catch (err) {
    console.error(
      `Error fetching combined variant and inventory data for product ${productId}:`,
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Failed to fetch combined data" });
  }
});
const serverless = require("serverless-http");
module.exports = serverless(app);
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
