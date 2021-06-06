const express = require('express');
const router = express.Router();
const request = require('request');
const auth = require('../../middleware/auth');
const config = require('config');
const { check, validationResult, body } = require('express-validator/check');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const { response } = require('express');

// @route GET api/profile/me
// @desc Get profile of me
// @access Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate(
      'user',
      ['name', 'avatar']
    );

    if (!profile) {
      return res.status(400).json({ msg: 'No profile for this user' });
    }

    res.json(profile);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('server-error');
  }

  res.send('Profile route');
});

// @route POST api/profile
// @desc Create or update user profile
// @access Private
router.post(
  '/',
  [
    auth,
    [
      check('status', 'status is required').not().isEmpty(),
      check('skills', 'skills is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      linkedin,
    } = req.body;

    //Build profile object
    const profileFields = {};
    profileFields.user = req.user.id;
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;

    if (skills) {
      profileFields.skills = skills.split(',').map((skill) => skill.trim());
    }

    //Build Social object

    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (twitter) profileFields.social.twitter = twitter;
    if (facebook) profileFields.social.facebook = facebook;
    if (linkedin) profileFields.social.linkedin = linkedin;

    try {
      let profile = await Profile.findOne({ user: req.user.id });

      if (profile) {
        //Update

        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );

        return res.json(profile);
      }

      //Create
      profile = new Profile(profileFields);
      await profile.save();
      res.json(profile);
    } catch (error) {
      console.log(console.log(error.message));
      res.status(500).send('server-error');
    }

    res.send('hello');
  }
);

// @route GET api/profile/
// @desc get all profiles
// @access Public

router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);

    if (!profiles)
      return res
        .status(400)
        .json({ msg: 'There are no profiles in our database' });

    res.json(profiles);
  } catch (err) {
    console.log(err.message);
    if (err.kind == 'ObjectId')
      return res
        .status(400)
        .json({ msg: 'There are no profiles in our database' });
    res.status(500).send('Server error');
  }
});

// @route GET api/profile/user/:user_id
// @desc get profile by userid
// @access Public

router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate('user', ['name', 'avatar']);

    if (!profile)
      return res.status(400).json({ msg: 'There is no profile for the user' });

    res.json(profile);
  } catch (err) {
    console.log(err.message);
    if (err.kind == 'ObjectId')
      return res.status(400).json({ msg: 'There is no profile for the user' });
    res.status(500).send('Server error');
  }
});

// @route DELETE api/profile
// @desc delete profile,user,posts
// @access Private

router.delete('/', auth, async (req, res) => {
  try {
    //Remove Profile
    await Profile.findOneAndRemove({ user: req.user.id });

    //Remove User
    await User.findOneAndRemove({ _id: req.user.id });

    res.json({ msg: ' user deleted' });
  } catch (err) {
    console.log(err.message);
    if (err.kind == 'ObjectId')
      return res.status(400).json({ msg: 'There is no profile for the user' });
    res.status(500).send('Server error');
  }
});

// @route PUT api/profile/experience
// @desc Add profile experience
// @access Private
router.put(
  '/experience',
  [
    auth,
    [
      check('title', 'titile is required').not().isEmpty(),
      check('company', 'compnay is required').not().isEmpty(),
      check('from', 'from is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, company, location, from, to, description } = req.body;

    const newExp = {
      title,
      company,
      location,
      from,
      to,
      description,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.experience.unshift(newExp);

      await profile.save();
      res.json(profile);
    } catch (err) {
      console.log(err.message);
      res.status(500).send('server-error');
    }
  }
);

// @route DELETE api/profile/experience/:exp_id
// @desc delet experience from profile
// @access Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    console.log(req.user.id);
    //Get remove index
    const removeIndex = profile.experience
      .map((item) => item.id)
      .indexOf(req.params.exp_id);

    profile.experience.splice(removeIndex, 1);

    await profile.save();
    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('server-error');
  }
});

// @route GET api/profile/github/:username
// @desc get repos from github
// @access Public
// router.get('/gihub/username', (req, res) => {
//   try {
//     const options = {
//       uri: 'https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubSecret')}',
//       method: 'GET',
//       headers: {'user-agent':'node.js'}
//     };
//     request(options, (error,response,body)=>{
//       if(error) console.log(errpr.message)

//       if(response.statusCode!=200){
//         res.status(400).json({msg:'No profile found'});
//       }

//       res.json(JSON.parse(body));

//     })
//   } catch (err) {
//     console.log(err.message);
//     res.status(500).send('server-error');
//   }
// });

module.exports = router;
