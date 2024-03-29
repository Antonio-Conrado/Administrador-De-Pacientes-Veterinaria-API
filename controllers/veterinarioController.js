import Veterinario from "../models/Veterinario.js";
import generarJWT from "../helpers/generarJWT.js";
import emailRegistro from '../helpers/emailRegistro.js';
import emailNuevoPassword from "../helpers/emailOlvidePassword.js";
import { v4 as uuidv4 } from 'uuid';

const registrar = async (req, res, next) => {
    const { email } = req.body;

    const existeUsuario = await Veterinario.findOne({ email });
    if (existeUsuario) {
        const error = new Error('Usuario ya registrado!');
        return res.status(400).json({ msg: error.message });
    };

    try {
        const veterinario = new Veterinario(req.body);
        await veterinario.save();

        //enviar el email
        emailRegistro({
            email : veterinario.email,
            nombre : veterinario.nombre,
            token : veterinario.token 
        });
        res.json(veterinario)
    } catch (error) {
        res.status(404).json({ msg: `${error}` })
    };


};

const cofirmarCuenta = async (req, res, next) => {
    const { token } = req.params;

    const usuarioConfirmar = await Veterinario.findOne({ token });
    if (!usuarioConfirmar) {
        const error = new Error('Token no válido!');
        return res.status(404).json({ msg: error.message });
    };

    try {
        usuarioConfirmar.token = null;
        usuarioConfirmar.confirmado = true;
        await usuarioConfirmar.save();
        res.status(200).json({ msg: 'Usuario confirmado correctamente!' });
    } catch (error) {
        res.status(500).json({ msg: `${error}` });
    }

};

const autenticar = async (req, res, next) => {
    const { email, password } = req.body;

    const usuario = await Veterinario.findOne({ email });

    if (!usuario) {
        const error = new Error("El usuario no existe!")
        return res.status(403).json({ msg: error.message });
    } else {
        //comprobar si el usuario esta confirmado
        if (!usuario.confirmado) {
            const error = new Error("Tu cuenta no ha sído confirmada!")
            res.status(403).json({ msg: error.message });
            return
        };

        if (await usuario.comprobarPassword(password)) {
            // /autenticar
            
            res.json({
                _id : usuario._id,
                nombre : usuario.nombre,
                email : usuario.email,
                token : generarJWT(usuario._id)
        });
        } else {
            const error = new Error("El password es incorrecto!")
            res.status(403).json({ msg: error.message });
        };
    };

};

const olvidePassword = async(req,res,next) =>{
    const{email} = req.body;

    const existeVeterinario = await Veterinario.findOne({email});
    if(!existeVeterinario){
        const error = new Error("El usuario no existe!")
        return res.status(400).json({ msg: error.message });
    };
    
    try {
        existeVeterinario.token = uuidv4();
        await existeVeterinario.save();

        // enviar email con instrucciones para restablecer password
        emailNuevoPassword({
            email,
            nombre : existeVeterinario.nombre,
            token : existeVeterinario.token
        })
        res.json({msg : "Te hemos enviado un email con las instrucciones para recuperar tu cuenta!"});
    } catch (error) {
        return res.status(500).json({ msg: `${error}` });
    }
};

const comprobarToken = async(req,res,next) =>{
    const {token} = req.params;

    const tokenValido = await Veterinario.findOne({token}); 
    if(!tokenValido){
        const error = new Error("El token no es válido!");
        return res.status(400).json({ msg: error.message });
    };

    res.json({msg : 'Token válido. El usuario existe!'});
};

const nuevoPassword = async(req,res,next) =>{
    const { token} = req.params;
    const{password} = req.body;

    const veterinario = await Veterinario.findOne({token}); 
    if(!veterinario){
        const error = new Error("El token no es válido!");
        return res.status(400).json({ msg: error.message });
    };

    try {
        veterinario.token = null;
        veterinario.password = password;
        await veterinario.save();
        res.json({msg : 'El password se modificó correctamente!'});
    } catch (error) {
        return res.status(500).json({ msg: `${error}`});
    };
};


const perfil = (req,res,next) =>{
    const {veterinario} = req;
    res.json(veterinario)
}

const actualizarPerfil = async (req,res,next) =>{
    const veterinario = await Veterinario.findById(req.params.id);

    if(!veterinario){
        const error = new Error('Hubo un error');
        return res.status(400).json({msg : error.message});
    };

    const { email} =req.body;
    if(veterinario.email !== req.body.email){
        const existeEmail = await Veterinario.findOne({email});

        if(existeEmail){
            return res.status(400).json({msg : 'El email ya existe!'});
        }
    }

    try {
        const veterinarioActualizado = await Veterinario.findOneAndUpdate({ _id: req.params.id }, req.body, {
            new: true,
            runValidators: true
        });
        const veterinarioPerfil = {
            nombre : veterinarioActualizado.nombre,
            email : veterinarioActualizado.email,
            telefono : veterinarioActualizado.telefono,
            web : veterinarioActualizado.web
        };
    
        res.status(200).json(veterinarioPerfil);
    } catch (error) {
        return res.status(500).json({ msg: `${error}`});
    }
};

const actualizarPassword = async(req,res,next) =>{
    const{id} = req.veterinario;
    const{passwordActual, nuevoPassword, repetirNuevoPassword} = req.body;

    const veterinario = await Veterinario.findById(id);
    if(!veterinario){
        const error = new Error('Hubo un error');
        return res.status(400).json({msg : error.message});
    };

    if(await veterinario.comprobarPassword(passwordActual)){
        if(nuevoPassword !== repetirNuevoPassword){
            const error = new Error('Las contraseñas no coinciden. Por favor, asegúrate de que ambas contraseñas sean iguales!');
            return res.status(400).json({msg : error.message});
        }
        veterinario.password = nuevoPassword;
        await veterinario.save();
        res.status(200).json({msg: 'Password actualizado correctamente!'});

    }else{
        const error = new Error('El Password actual es incorrecto!');
        return res.status(400).json({msg : error.message});
    }
};
export {
    registrar,
    cofirmarCuenta,
    autenticar,
    olvidePassword,
    comprobarToken,
    nuevoPassword,
    perfil,
    actualizarPerfil,
    actualizarPassword
}