const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Connect DB
const db = new sqlite3.Database("./inventory.db");

// ✅ Create tables if not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS Customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity_in_stock INTEGER NOT NULL,
    category_id INTEGER,
    FOREIGN KEY(category_id) REFERENCES Categories(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES Customers(id),
    FOREIGN KEY(product_id) REFERENCES Products(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT
  )`);
});

//
// ---------- CRUD ROUTES ----------
//

// Add Product
app.post("/products", (req, res) => {
  const { name, price, quantity_in_stock, category_id } = req.body;
  db.run(
    "INSERT INTO Products (name, price, quantity_in_stock, category_id) VALUES (?, ?, ?, ?)",
    [name, price, quantity_in_stock, category_id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ product_id: this.lastID });
    }
  );
});

// Add Customer
app.post("/customers", (req, res) => {
  const { name, email } = req.body;
  db.run(
    "INSERT INTO Customers (name, email) VALUES (?, ?)",
    [name, email],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ customer_id: this.lastID });
    }
  );
});

// Create Order (reduce stock)
app.post("/orders", (req, res) => {
  const { customer_id, product_id, quantity } = req.body;

  // Check stock
  db.get("SELECT quantity_in_stock FROM Products WHERE id=?", [product_id], (err, product) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (product.quantity_in_stock < quantity)
      return res.status(400).json({ error: "Not enough stock" });

    // Deduct stock & create order
    db.serialize(() => {
      db.run(
        "UPDATE Products SET quantity_in_stock = quantity_in_stock - ? WHERE id=?",
        [quantity, product_id]
      );
      db.run(
        "INSERT INTO Orders (customer_id, product_id, quantity) VALUES (?, ?, ?)",
        [customer_id, product_id, quantity],
        function (err) {
          if (err) return res.status(400).json({ error: err.message });
          res.json({ order_id: this.lastID, message: "Order created" });
        }
      );
    });
  });
});

// Update Order (restore old stock, deduct new stock)
app.put("/orders/:id", (req, res) => {
  const { customer_id, product_id, quantity } = req.body;
  const orderId = req.params.id;

  db.get("SELECT * FROM Orders WHERE id=?", [orderId], (err, oldOrder) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!oldOrder) return res.status(404).json({ error: "Order not found" });

    // Restore old stock
    db.run(
      "UPDATE Products SET quantity_in_stock = quantity_in_stock + ? WHERE id=?",
      [oldOrder.quantity, oldOrder.product_id],
      (err) => {
        if (err) return res.status(400).json({ error: err.message });

        // Check stock for new request
        db.get("SELECT quantity_in_stock FROM Products WHERE id=?", [product_id], (err, product) => {
          if (err) return res.status(400).json({ error: err.message });
          if (!product) return res.status(404).json({ error: "Product not found" });
          if (product.quantity_in_stock < quantity)
            return res.status(400).json({ error: "Not enough stock" });

          // Deduct new stock & update order
          db.serialize(() => {
            db.run(
              "UPDATE Products SET quantity_in_stock = quantity_in_stock - ? WHERE id=?",
              [quantity, product_id]
            );
            db.run(
              "UPDATE Orders SET customer_id=?, product_id=?, quantity=? WHERE id=?",
              [customer_id, product_id, quantity, orderId],
              function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: "Order updated", updated: this.changes });
              }
            );
          });
        });
      }
    );
  });
});

// Delete Order (restore stock)
app.delete("/orders/:id", (req, res) => {
  const orderId = req.params.id;

  db.get("SELECT * FROM Orders WHERE id=?", [orderId], (err, order) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!order) return res.status(404).json({ error: "Order not found" });

    db.serialize(() => {
      db.run(
        "UPDATE Products SET quantity_in_stock = quantity_in_stock + ? WHERE id=?",
        [order.quantity, order.product_id]
      );
      db.run("DELETE FROM Orders WHERE id=?", [orderId], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "Order deleted", deleted: this.changes });
      });
    });
  });
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
