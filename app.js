require("dotenv").config();
const md5 = require("md5");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const express = require("express");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.set("view engine", "ejs");
mongoose.connect("mongodb://localhost:27017/whisperDB", {
  useNewUrlParser: true,
});

const userSchema = new mongoose.Schema({ email: String, password: String });
const secretSchema = new mongoose.Schema({ secret: String });

const User = mongoose.model("User", userSchema);
const Secret = mongoose.model("Secret", secretSchema);

let isGreen = false;
let isRed = false;

app.get("/", (req, res) => {
  res.render("home");
});

app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    const user = new User({ email: req.body.e, password: md5(req.body.p) });
    user.save((err) => {
      if (!err) {
        isGreen = true;
        res.redirect("/login");
      }
    });
  });

app
  .route("/login")
  .get((req, res) => {
    res.render("login", { isGreen: isGreen, isRed: isRed });
    isGreen = false;
    isRed = false;
  })
  .post((req, res) => {
    User.findOne({ email: req.body.e }, (err, found) => {
      if (!found) {
        isRed = true;
        res.redirect("/login");
      } else {
        if (found.password == md5(req.body.p)) {
          Secret.find((err, secrets) => {
            if (!err) {
              res.render("secrets", { secrets: secrets });
            }
          });
        } else {
          isRed = true;
          res.redirect("/login");
        }
      }
    });
  });

app
  .route("/submit")
  .get((req, res) => {
    res.render("submit");
  })
  .post((req, res) => {
    const secret = new Secret({ secret: req.body.s });
    secret.save((err) => {
      if (!err) {
        Secret.find((err, secrets) => {
          if (!err) {
            res.render("secrets", { secrets: secrets });
          }
        });
      }
    });
  });

app.listen(3000, () => console.log(`App listening on port 3000`));
