How to Run the Project
1. Clone or create the project folder

If you already have it locally, skip this step:

mkdir crud-app
cd crud-app

2. Install dependencies

Make sure you have Node.js installed (node -v to check).
Run:

npm init -y
npm install express sqlite3 body-parser

3. Add the project files

Create a file index.js → paste the server code.

Create the database file inventory.db:

sqlite3 inventory.db


Inside the SQLite shell, create your tables:

CREATE TABLE Customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE
);

CREATE TABLE Categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE Products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER,
  quantity_in_stock INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES Categories(id)
);

CREATE TABLE Orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  order_date TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES Customers(id)
);

CREATE TABLE OrderItems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES Orders(id),
  FOREIGN KEY (product_id) REFERENCES Products(id)
);


Then type .exit to leave SQLite.

4. Start the server

Run:

node index.js


You should see:

Server running on http://localhost:3000

📡 API Endpoints
Customers

POST /customers → Add a new customer

{ "name": "John Doe", "email": "john@example.com" }


GET /customers → List all customers

Categories

POST /categories → Add a new category

{ "name": "Electronics" }


GET /categories → List all categories

Products

POST /products → Add a new product

{ "name": "Laptop", "category_id": 1, "quantity_in_stock": 10 }


GET /products → List all products

PUT /products/:id → Update a product

DELETE /products/:id → Delete a product

Orders

POST /orders → Create an order & reduce product stock

{ "customer_id": 1, "product_id": 2, "quantity": 3 }


GET /orders → List all orders
