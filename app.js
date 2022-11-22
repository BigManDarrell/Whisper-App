require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

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

const userSchema = new mongoose.Schema({
  googleId: String,
  facebookId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser((user, cb) => {
  process.nextTick(() =>
    cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    })
  );
});
passport.deserializeUser((user, cb) => {
  process.nextTick(() => cb(null, user));
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    (accessToken, refreshToken, profile, cb) => {
      User.findOrCreate(
        { googleId: profile.id, username: profile.emails[0].value },
        (err, user) => cb(err, user)
      );
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FB_ID,
      clientSecret: process.env.FB_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/secrets",
      profileFields: ["id", "displayName", "photos", "email"],
    },
    (accessToken, refreshToken, profile, cb) => {
      User.findOrCreate(
        { facebookId: profile.id, username: profile.emails[0].value },
        (err, user) => cb(err, user)
      );
    }
  )
);

let isRed = false;

app.route("/").get((req, res) => {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["public_profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/register" }),
  (req, res) => {
    res.redirect("/secrets");
  }
);

app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/register" }),
  (req, res) => {
    res.redirect("/secrets");
  }
);

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
  User.find({"secret": {$ne: null}}, (err, users) => {
    if (users) {
      res.render("secrets", { users: users });
    }
  });
});

app
  .route("/submit")
  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  })
  .post((req, res) => {
    User.findOne({ username: req.user.username }, (err, found) => {
      if (found) {
        found.secret = req.body.s;
        found.save();
        res.redirect("/secrets");
      }
    });
  });

app.listen(3000, () => console.log(`App listening on port 3000`));
