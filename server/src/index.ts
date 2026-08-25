import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import productosRoutes from './routes/productos.routes'
import inventarioRoutes from './routes/inventario.routes'
import combosRoutes from './routes/combos.routes';
import promocionesRoutes from './routes/promociones.routes';
import metodosPagoRoutes from './routes/metodosPago.routes';
import ventasRoutes from './routes/ventas.routes';
import usuariosRoutes from './routes/usuarios.routes';
import mesasRoutes from './routes/mesas.routes'
import pedidosRoutes from './routes/pedidos.routes';
import categoriasRoutes from './routes/categorias.routes'
import imagenesRoutes from './routes/imagenes.routes';

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

// Autenticacion y usuarios
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Productos uploads e imagenes
app.use('/api/productos', productosRoutes)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/imagenes', imagenesRoutes);

// Inventario y categorias
app.use('/api/inventario', inventarioRoutes)
app.use('/api/categorias', categoriasRoutes)

// Combos y promociones
app.use('/api/combos', combosRoutes);
app.use('/api/promociones', promocionesRoutes);

// Metodos de pago y ventas
app.use('/api/metodos-pago', metodosPagoRoutes);
app.use('/api/ventas', ventasRoutes);

// Mesas y pedidos
app.use('/api/mesas', mesasRoutes);
app.use('/api/pedidos', pedidosRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});