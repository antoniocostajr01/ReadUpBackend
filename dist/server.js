"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_routes_1 = require("./routes/user.routes");
const auth_routes_1 = require("./routes/auth.routes");
const book_routes_1 = require("./routes/book.routes");
const ai_routes_1 = require("./routes/ai.routes");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
//Rotas de /users
app.use('/users', user_routes_1.userRoutes);
//Rotas de auth
app.use('/auth', auth_routes_1.authRoutes);
//Rotas de /books
app.use('/books', book_routes_1.bookRoutes);
//Rotas de /ai
app.use('/ai', ai_routes_1.aiRoutes);
app.get('/', (req, res) => {
    res.json({ message: 'Backend working!' });
});
app.listen(PORT, () => {
    console.log(`🤟🏻 Server working on PORT ${PORT}`);
});
