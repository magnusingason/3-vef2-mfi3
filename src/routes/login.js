import passport from 'passport';
import { Strategy } from 'passport-local';

import { comparePasswords, findByUsername, findById } from '../users.js';

async function strat(username, password, done) {
    try {
      const user = await findByUsername(username);
  
      if (!user) {
        return done(null, false);
      }
  
      // Verður annað hvort notanda hlutur ef lykilorð rétt, eða false
      const result = await comparePasswords(password, user.password);
      return done(null, result ? user : false);
    } catch (err) {
      console.error(err);
      return done(err);
    }
  }

  // Notum local strategy með „strattinu“ okkar til að leita að notanda
  passport.use(new Strategy(strat));
  
  // getum stillt með því að senda options hlut með
  // passport.use(new Strategy({ usernameField: 'email' }, strat));
  
  // Geymum id á notanda í session, það er nóg til að vita hvaða notandi þetta er
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  // Sækir notanda út frá id
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  
  export function ensureLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
  
    return res.redirect('/admin/login');
  }
  
export default passport;