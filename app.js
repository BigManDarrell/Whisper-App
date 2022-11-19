require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(
  session({
    secret: "Shush this is a lil secret.",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/whisperDB", {
  useNewUrlParser: true,
});

const userSchema = new mongoose.Schema({});
const secretSchema = new mongoose.Schema({ secret: String });

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);
const Secret = mongoose.model("Secret", secretSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

let isRed = false;

app.route("/").get((req, res) => {
  res.render("home");
});

app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    User.register(
      { username: req.body.username },
      req.body.password,
      (err, user) => {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, () => {
            res.redirect("/secrets");
          });
        }
      }
    );
  });

app
  .route("/login")
  .get((req, res) => {
    res.render("login", { isRed: isRed });
    isRed = false;
  })
  .post((req, res) => {
    User.findOne({ username: req.body.username }, (err, found) => {
      if (!found) {
        isRed = true;
        res.redirect("/login");
      } else {
        passport.authenticate("local", (err, user) => {
          if (user) {
            req.login(user, (err) => {
              if (!err) {
                res.redirect("/secrets");
              }
            });
          } else {
            isRed = true;
            res.redirect("/login");
          }
        })(req, res);
      }
    });
  });

app.route("/logout").post((req, res) => {
  req.logout((err) => {
    if (!err) {
      res.redirect("/");
    }
  });
});

app.route("/secrets").get((req, res) => {
  if (req.isAuthenticated()) {
    Secret.find((err, secrets) => {
      if (!err) {
        res.render("secrets", { secrets: secrets });
      }
    });
  } else {
    res.redirect("/login");
  }
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
