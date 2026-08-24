import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import productosRoutes from './routes/productos.routes'
import inventarioRoutes from './routes/inventario.routes'
import combosRoutes from './routes/combos.routes';
import promocionesRoutes from './routes/promociones.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mensaje: 'API del sistema de ventas funcionando 🍗' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Autenticacion
app.use('/api/auth', authRoutes);

// Productos e inventario
app.use('/api/productos', productosRoutes)
app.use('/api/inventario', inventarioRoutes)

// Combos y promociones
app.use('/api/combos', combosRoutes);
app.use('/api/promociones', promocionesRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});