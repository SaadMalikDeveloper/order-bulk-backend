const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 5000;

const API_TOKEN = "6avn43sdngehh0rh0cegbvpkxga9j0r";
const BASE_URL = "https://api.bigcommerce.com/stores/rtw9pdfcir/v3/catalog";

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
