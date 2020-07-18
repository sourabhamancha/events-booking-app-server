const graphql = require("graphql");
const Event = require("../models/event");
const User = require("../models/user");
const Booking = require("../models/booking");
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLSchema,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFloat,
  GraphQLInputObjectType,
} = graphql;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

const AuthDataType = new GraphQLObjectType({
  name: "AuthData",
  fields: () => ({
    userId: { type: new GraphQLNonNull(GraphQLID) },
    token: { type: new GraphQLNonNull(GraphQLString) },
    tokenExp: { type: new GraphQLNonNull(GraphQLInt) },
  }),
});

const EventType = new GraphQLObjectType({
  name: "Event",
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    price: { type: new GraphQLNonNull(GraphQLFloat) },
    date: { type: new GraphQLNonNull(GraphQLString) },
    creatorId: { type: new GraphQLNonNull(GraphQLString) },
    creator: {
      type: UserType,
      resolve(parent, args) {
        return User.findById(parent.creatorId);
      },
    },
    bookings: {
      type: new GraphQLList(BookingType),
      resolve(parent, args) {
        return Booking.find({ eventId: parent._id });
      },
    },
  }),
});

const UserType = new GraphQLObjectType({
  name: "User",
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    email: { type: GraphQLString },
    password: { type: GraphQLString },
    username: { type: GraphQLString },
    avator: { type: GraphQLString },
    createdEvents: {
      type: new GraphQLList(EventType),
      resolve(parent, args) {
        //
        return Event.find({ creatorId: parent._id });
      },
    },
  }),
});

const BookingType = new GraphQLObjectType({
  name: "Booking",
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    eventId: { type: GraphQLString },
    userId: { type: GraphQLString },
    event: {
      type: EventType,
      resolve(parent, args) {
        //
        return Event.findById(parent.eventId);
      },
    },
    user: {
      type: UserType,
      resolve(parent, args) {
        //
        return User.findById(parent.userId);
      },
    },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
  }),
});

const createEventInput = new GraphQLInputObjectType({
  name: "EventInput",
  description: "Input payload for creating events",
  fields: () => ({
    creatorId: { type: new GraphQLNonNull(GraphQLString) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    price: { type: new GraphQLNonNull(GraphQLFloat) },
    date: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const deleteEventInput = new GraphQLInputObjectType({
  name: "DeleteEventInput",
  description: "Input payload for deleting an event",
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLString) },
    creatorId: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const registerUserInput = new GraphQLInputObjectType({
  name: "UserInput",
  description: "Input payload for creating a new user",
  fields: () => ({
    username: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    password: { type: new GraphQLNonNull(GraphQLString) },
    avator: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const LoginUserInputType = new GraphQLInputObjectType({
  name: "LoginInput",
  description: "Input payload for logging in a user",
  fields: () => ({
    email: { type: new GraphQLNonNull(GraphQLString) },
    password: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const createBookingInput = new GraphQLInputObjectType({
  name: "CreateBookingInput",
  description: "Input payload for creating a new booking",
  fields: () => ({
    eventId: { type: new GraphQLNonNull(GraphQLString) },
    userId: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    // get all events
    events: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(EventType))),
      resolve(parent, args) {
        return Event.find({});
      },
    },
    // get specific events
    getEvent: {
      type: EventType,
      args: {
        eventId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve(parent, args) {
        return Event.findById(args.eventId);
      },
    },
    // get all users
    users: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UserType))),
      resolve(parent, args) {
        return User.find({});
      },
    },
    // get all bookings
    bookings: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(BookingType))
      ),
      resolve(parent, args, req) {
        if (!req.isAuth) {
          throw new Error("Unauthenticated!");
        }
        return Booking.find({});
      },
    },
    // get specific user bookings
    userBookings: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(BookingType))
      ),
      args: {
        userId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve(parent, args) {
        return Booking.find({ userId: args.userId });
      },
    },
  },
});

const Mutation = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    // login user
    login: {
      type: AuthDataType,
      args: {
        input: {
          type: LoginUserInputType,
        },
      },
      async resolve(parent, args) {
        // check email and password validity
        const user = await User.findOne({ email: args.input.email });
        if (!user) {
          throw new Error("User does not exist!");
        }
        const isEqual = await bcrypt.compare(
          args.input.password,
          user.password
        );
        if (!isEqual) {
          throw new Error("Password is incorrect!");
        }
        // create a token
        const token = jwt.sign(
          {
            userId: user._id,
            email: user.email,
            avator: user.avator,
          },
          SECRET_KEY,
          {
            expiresIn: "1h",
          }
        );
        return {
          userId: user._id,
          token: token,
          tokenExp: 1,
        };
      },
    },
    // create a new event
    createEvent: {
      type: EventType,
      args: {
        input: {
          type: createEventInput,
        },
      },
      resolve(parent, args) {
        // if (!req.isAuth) {
        //   throw new Error("Unauthenticated!");
        // }
        let eventData = new Event({
          title: args.input.title,
          description: args.input.description,
          price: args.input.price,
          date: args.input.date,
          creatorId: args.input.creatorId,
        });
        return eventData.save();
      },
    },
    // delete an existing event
    deleteEvent: {
      type: EventType,
      args: {
        input: {
          type: deleteEventInput,
        },
      },
      resolve(parent, args) {
        return Event.findById(args.input._id)
          .then((event) => {
            return event.delete();
          })
          .catch((err) => {
            throw new Error(err);
          });
      },
    },
    // create a new user
    registerUser: {
      type: AuthDataType,
      args: {
        input: {
          type: registerUserInput,
        },
      },

      async resolve(parent, args) {
        // check email and password validity
        const user = await User.findOne({ email: args.input.email });
        if (user) {
          throw new Error("Acount already exists with the same email!");
        }

        const hashedPassword = await bcrypt.hash(args.input.password, 12);

        const userData = new User({
          username: args.input.username,
          email: args.input.email,
          password: hashedPassword,
          avator: args.input.avator,
        });

        const res = await userData.save();
        // create a token
        const token = jwt.sign(
          {
            userId: res._id,
            email: res.email,
            avator: res.avator,
          },
          SECRET_KEY,
          {
            expiresIn: "1h",
          }
        );
        return {
          userId: res._id,
          token: token,
          tokenExp: 1,
        };
      },
    },
    // create a new booking
    createBooking: {
      type: BookingType,
      args: {
        input: {
          type: createBookingInput,
        },
      },
      resolve(parent, args) {
        //
        let bookingData = new Booking({
          eventId: args.input.eventId,
          userId: args.input.userId,
        });
        return bookingData.save();
      },
    },
    // delete an existing booking
    deleteBooking: {
      type: EventType,
      args: {
        bookingId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve(parent, args) {
        return Booking.findById(args.bookingId)
          .then((booking) => {
            return booking.delete();
          })
          .catch((err) => {
            throw new Error(err);
          });
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
});
