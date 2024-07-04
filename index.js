const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();
const port = 8000;

const cors = require("cors");

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const jwt = require("jsonwebtoken");

mongoose
  .connect(
    "mongodb+srv://intellistock:7Y9gbp5Cjl4IiX1D@cluster0.erulfox.mongodb.net/",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDb", err);
  });

app.listen(port, () => {
  console.log("Server is running on port 8000");
});

const User = require("./models/user");
const Order = require("./models/order");
const Product = require("./models/product");
const Favourite = require("./models/favourite");
const Offer = require("./models/offer");

const generateSecretKey = () => {
  const secretKey = crypto.randomBytes(32).toString("hex");

  return secretKey;
};

const secretKey = generateSecretKey();
app.post("/register", async (req, res) => {
  try {
    const { name, email, phoneNumber, password, role } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("Email already registered:", email);
      return res.status(400).json({ message: "Email already registered" });
    }

    const newUser = new User({ name, email, phoneNumber, password });

    await newUser.save();

    console.log("New User Registered:", newUser);

    // sendVerificationEmail(newUser.email, newUser.verificationToken);

    res.status(201).json({
      message:
        "Registration successful. Please check your email for verification.",
    });
  } catch (error) {
    console.log("Error Registering User", error);
    res.status(500).json({ message: "Registration Failed" });
  }
});

app.post("/products", async (req, res) => {
  try {
    const { title, price, description, category, image, trendingProduct } =
      req.body;

    // Create a new product instance
    const newProduct = new Product({
      title,
      price,
      description,
      category,
      image,
      trendingProduct,
    });

    // Save the new product to the database
    await newProduct.save();

    console.log("New Product Added:", newProduct);

    res.status(201).json({
      message: "Product added successfully.",
      product: newProduct, // Optional: Send back the added product details
    });
  } catch (error) {
    console.error("Error Adding Product", error);
    res.status(500).json({ message: "Failed to add product." });
  }
});

app.post("/offers", async (req, res) => {
  try {
    const {
      id,
      title,
      price,
      description,
      category,
      image,
      oldPrice,
      discount,
    } = req.body;

    // Create a new product instance
    const newOfferProduct = new Offer({
      id,
      title,
      price,
      description,
      category,
      image,
      oldPrice,
      discount,
    });

    // Save the new product to the database
    await newOfferProduct.save();

    console.log("New Offer Product Added:", newOfferProduct);

    res.status(201).json({
      message: "Product added successfully.",
      offerProduct: newOfferProduct, // Optional: Send back the added product details
    });
  } catch (error) {
    console.error("Error Adding Product", error);
    res.status(500).json({ message: "Failed to add product." });
  }
});

app.post("/favourite", async (req, res) => {
  try {
    const { title, price, description, category, image, userId } = req.body;

    // Check if the favorite already exists for the user
    const existingFavorite = await Favourite.findOne({ title, userId });

    if (existingFavorite) {
      return res
        .status(400)
        .json({ message: "This item is already in your favorites." });
    }

    // Create a new favorite instance
    const newFavorite = new Favourite({
      title,
      price,
      description,
      category,
      image,
      userId,
    });

    // Save the new favorite to the database
    await newFavorite.save();

    console.log("New Favorite Added:", newFavorite);

    res.status(201).json({
      message: "Added successfully.",
      favourite: newFavorite, // Optional: Send back the added product details
    });
  } catch (error) {
    console.error("Error Adding", error);
    res.status(500).json({ message: "Failed to add." });
  }
});

//endpoint to login the user!
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    //check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    //check if the password is correct
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }
    // console.log(user.role);

    //generate a token
    const token = jwt.sign({ userId: user._id }, secretKey);

    res.status(200).json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Login Failed" });
  }
});

//endpoint to store a new address to the backend
app.post("/addresses", async (req, res) => {
  try {
    const { userId, address } = req.body;

    //find the user by the Userid
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //add the new address to the user's addresses array
    user.addresses.push(address);

    //save the updated user in te backend
    await user.save();

    res.status(200).json({ message: "Address created Successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error addding address" });
  }
});

//endpoint to store all the orders
app.post("/orders", async (req, res) => {
  try {
    const { userId, cartItems, totalPrice, shippingAddress, paymentMethod } =
      req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //create an array of product objects from the cart Items
    const products = cartItems.map((item) => ({
      name: item?.title,
      quantity: item.quantity,
      price: item.price,
      image: item?.image,
    }));

    //create a new Order
    const order = new Order({
      user: userId,
      products: products,
      totalPrice: totalPrice,
      shippingAddress: shippingAddress,
      paymentMethod: paymentMethod,
    });

    await order.save();

    res.status(200).json({ message: "Order created successfully!" });
  } catch (error) {
    console.log("error creating orders", error);
    res.status(500).json({ message: "Error creating orders" });
  }
});

//endpoint to get all the addresses of a particular user
app.get("/addresses/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const addresses = user.addresses;
    res.status(200).json({ addresses });
  } catch (error) {
    res.status(500).json({ message: "Error retrieveing the addresses" });
  }
});

//get the user profile
app.get("/profile/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving the user profile" });
  }
});

app.get("/orders/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const orders = await Order.find({ user: userId }).populate("user");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this user" });
    }

    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find();

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

app.get("/offers", async (req, res) => {
  try {
    const offers = await Offer.find();

    if (!offers || offers.length === 0) {
      return res.status(404).json({ message: "No offers found" });
    }

    res.status(200).json({ offers });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

app.get("/favourite", async (req, res) => {
  try {
    const favourite = await Favourite.find();

    if (!favourite || favourite.length === 0) {
      return res.status(404).json({ message: "No favourite found" });
    }

    res.status(200).json({ favourite });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

app.put("/orders/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { status, riderName, riderEmail } = req.body;

    // Ensure orderId is correctly parsed and used in Mongoose update
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status, riderName, riderEmail }, // Update status, riderName, and riderEmail
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res
      .status(200)
      .json({ message: "Order updated successfully", updatedOrder });
  } catch (error) {
    console.log("Error updating order:", error);
    res.status(500).json({ message: "Error updating order" });
  }
});

// DELETE a product by ID
app.delete("/products/:productId", async (req, res) => {
  try {
    console.log(req.params.productId);
    const productId = req.params.productId;

    // Find the product by ID and delete it
    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      // return res.status(404).json({ message: "Product not found" });
      console.log("ERROR");
    }

    res.json({ message: "Product deleted successfully", deletedProduct });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

app.delete("/users/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Implement logic to find user by ID and delete
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully", deletedUser });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

app.delete("/orders/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    // console.log(orderId);
    // Implement logic to find user by ID and delete
    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted successfully", deletedOrder });
  } catch (error) {
    console.error("Error deleting Order:", error);
    res.status(500).json({ message: "Failed to delete Order" });
  }
});

app.delete("/favourites/:favouriteId", async (req, res) => {
  try {
    const favouriteId = req.params.favouriteId;
    // console.log(favouriteId);
    // Implement logic to find user by ID and delete
    const deletedFavourite = await Favourite.findByIdAndDelete(favouriteId);
    // console.log(deletedFavourite);
    if (!deletedFavourite) {
      return res.status(404).json({ message: "favourite not found" });
    }

    res.json({ message: "favourite deleted successfully", deletedFavourite });
  } catch (error) {
    console.error("Error deleting favourite:", error);
    res.status(500).json({ message: "Failed to delete favourite" });
  }
});
