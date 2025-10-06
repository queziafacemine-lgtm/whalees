const express = require('express');
const Message = require('../models/Message');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configurar multer para upload de mídia
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'messages');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Permitir imagens, vídeos, áudios e documentos
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mp3|wav|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Listar todas as mensagens
router.get('/', async (req, res) => {
  try {
    const messages = await Message.findAll();
    res.json(messages);
  } catch (error) {
    console.error('Erro ao listar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter mensagem por ID
router.get('/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }
    res.json(message);
  } catch (error) {
    console.error('Erro ao obter mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova mensagem
router.post('/', upload.single('media'), async (req, res) => {
  try {
    const { name, content, variables } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ error: 'Nome e conteúdo são obrigatórios' });
    }

    // Verificar se já existe mensagem com esse nome
    const existing = await Message.findByName(name);
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma mensagem com esse nome' });
    }

    let parsedVariables = {};
    if (variables) {
      try {
        parsedVariables = typeof variables === 'string' ? JSON.parse(variables) : variables;
      } catch (e) {
        return res.status(400).json({ error: 'Formato de variáveis inválido' });
      }
    }

    const mediaPath = req.file ? req.file.filename : null;
    const messageId = await Message.create(name, content, parsedVariables, mediaPath);
    
    const newMessage = await Message.findById(messageId);
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Erro ao criar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar mensagem
router.put('/:id', upload.single('media'), async (req, res) => {
  try {
    const { name, content, variables } = req.body;
    const messageId = req.params.id;
    
    const existingMessage = await Message.findById(messageId);
    if (!existingMessage) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    if (!name || !content) {
      return res.status(400).json({ error: 'Nome e conteúdo são obrigatórios' });
    }

    // Verificar se outro registro já usa esse nome
    const nameCheck = await Message.findByName(name);
    if (nameCheck && nameCheck.id != messageId) {
      return res.status(400).json({ error: 'Já existe uma mensagem com esse nome' });
    }

    let parsedVariables = {};
    if (variables) {
      try {
        parsedVariables = typeof variables === 'string' ? JSON.parse(variables) : variables;
      } catch (e) {
        return res.status(400).json({ error: 'Formato de variáveis inválido' });
      }
    }

    // Se novo arquivo foi enviado, usar ele; senão manter o anterior
    const mediaPath = req.file ? req.file.filename : existingMessage.media_path;
    
    // Se novo arquivo foi enviado e havia um anterior, deletar o anterior
    if (req.file && existingMessage.media_path) {
      const oldFilePath = path.join(__dirname, '..', 'uploads', 'messages', existingMessage.media_path);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    await Message.update(messageId, name, content, parsedVariables, mediaPath);
    
    const updatedMessage = await Message.findById(messageId);
    res.json(updatedMessage);
  } catch (error) {
    console.error('Erro ao atualizar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar mensagem
router.delete('/:id', async (req, res) => {
  try {
    const messageId = req.params.id;
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    // Deletar arquivo de mídia se existir
    if (message.media_path) {
      const filePath = path.join(__dirname, '..', 'uploads', 'messages', message.media_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Message.delete(messageId);
    res.json({ success: true, message: 'Mensagem deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;