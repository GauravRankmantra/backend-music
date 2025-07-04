const express = require('express');
const router = express.Router();

const userRouter = require('./user.routes.js');
const authRouter = require('./auth.routes.js');
const songRouter = require('./song.routes.js');
const genreRouter = require('./genre.route.js');
const albumRouter = require('./album.router.js');
const planRouter = require('./plan.router.js');
const homeRouter = require('./home.router.js');
const playlistRouter = require('./playlist.router.js');
// const adminRouter = require("./admin.router.js")
const adminRouter = require('./admin.router.js');
const trafficRouter = require('./traffic.router.js');
const likeRouter = require('./like.router.js');
const paymentRouter = require('./payment.router.js');
const contactRouter = require('./contact.router.js');
const privacyRouter = require('./privacyPolicy.router.js');
const termsRouter = require('./terms.router.js');
const userDashbordRouter = require('./userDashbord.router.js');
const webUpdateRouter = require('./webUpdate.router.js');
const ticketRouter = require('./ticket.router.js');
const userStatsRouter = require('./userStats.router.js');
const salesRouter = require('./sales.router.js');
const AdminVideo = require('./video.router.js');
const Seller = require('./seller.router.js');
const messageRouter = require('./message.router.js');
const footerRouter = require('./footer.router.js');
const donationRouter = require('./donation.router.js');
const sponsorRouter = require('./sponsor.router.js');
const subscriberRouter = require('./subscriber.router.js');
const songMailRouter = require('./songMail.router.js')
const squarePaymentRouter = require('./squarePayment.router.js')

router.use('/user', userRouter);
router.use('/userDashbord', userDashbordRouter);
router.use('/payment', paymentRouter);
router.use('/playlist', playlistRouter);
router.use('/like', likeRouter);
router.use('/home', homeRouter);
router.use('/auth', authRouter);
router.use('/song', songRouter);
router.use('/genre', genreRouter);
router.use('/albums', albumRouter);
router.use('/ticket', ticketRouter);
router.use('/plan', planRouter);
router.use('/admin', adminRouter);
router.use('/traffic', trafficRouter);
router.use('/contact', contactRouter);
router.use('/privacy', privacyRouter);
router.use('/terms', termsRouter);
router.use('/web', webUpdateRouter);
router.use('/userStats', userStatsRouter);
router.use('/sale', salesRouter);
router.use('/AdminVideo', AdminVideo);
router.use('/seller', Seller);
router.use('/message', messageRouter);
router.use('/footer', footerRouter);
router.use('/sponsor', sponsorRouter);
router.use('/donation', donationRouter);
router.use('/subscribe', subscriberRouter);
router.use('/songMail',songMailRouter)
router.use('/payment',squarePaymentRouter)

module.exports = router;
