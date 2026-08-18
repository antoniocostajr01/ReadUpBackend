import express from 'express';
import { userRoutes } from './routes/user.routes';
import { authRoutes } from './routes/auth.routes';
import { bookRoutes } from './routes/book.routes';
import { sessionRoutes } from './routes/reading-session.routes';
import { aiRoutes } from './routes/ai.routes';

const app = express();

// Render termina o TLS e repassa via X-Forwarded-Proto; sem isso, req.protocol
// sempre reporta "http" e a URL de capa gerada abaixo quebraria em produção.
app.set('trust proxy', true);

const PORT = process.env.PORT || 3000;

// Limite ampliado para acomodar avatares em base64 enviados no PUT /users/me.
app.use(express.json({ limit: '5mb' }));

//Rotas de /users
app.use('/users', userRoutes);

//Rotas de auth
app.use('/auth', authRoutes);

//Rotas de /books
app.use('/books', bookRoutes);

//Rotas de /sessions
app.use('/sessions', sessionRoutes);

//Rotas de /ai
app.use('/ai', aiRoutes);

app.get('/', (req, res) => {
    res.json({message : 'Backend working!'});
});

app.listen(PORT, ()=> {
    console.log(`🤟🏻 Server working on PORT ${PORT}`)
});