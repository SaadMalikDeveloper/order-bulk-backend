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
    const response = await axios.get(
      `${BASE_URL}/products/${productId}/variants`,
      {
        headers,
      }
    );

    res.json({
      product_id: productId,
      total: response.data.data.length,
      variants: response.data.data,
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

app.listen(PORT, () => {
  console.log(`Server running at on render`);
});
