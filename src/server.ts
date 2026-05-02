import express from 'express';
import { userRoutes } from './routes/user.routes';
import { authRoutes } from './routes/auth.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

//Rotas de /users
app.use('/users', userRoutes);

//Rotas de auth
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({message : 'Backend working!'});
});

app.listen(PORT, ()=> {
    console.log(`🤟🏻 Server working on PORT ${PORT}`)
});