// **Analizador Léxico**
function analizarLexico(codigoFuente) {
    const tokens = [];
    const patrones = [
        { tipo: 'PALABRA_CLAVE', regex: /\b(let|if|else|while|for|class|function|return|const|var|switch|case|break|default|continue)\b/ },
        { tipo: 'OPERADOR', regex: /[+\-*/=<>!]=?|==|!=|\+\+|--/ },
        { tipo: 'DELIMITADOR', regex: /[(){};,.]/ },
        { tipo: 'IDENTIFICADOR', regex: /\b[a-zA-Z_]\w*\b/ },
        { tipo: 'CONSTANTE', regex: /\b\d+(\.\d+)?\b/ },
        { tipo: 'ESPACIO', regex: /\s+/ }
    ];

    let cursor = 0;

    while (cursor < codigoFuente.length) {
        let encontrado = false;

        for (const patron of patrones) {
            const regex = new RegExp(`^${patron.regex.source}`);
            const match = codigoFuente.slice(cursor).match(regex);

            if (match) {
                if (patron.tipo !== 'ESPACIO') {
                    tokens.push({ tipo: patron.tipo, valor: match[0] });
                }
                cursor += match[0].length;
                encontrado = true;
                break;
            }
        }

        if (!encontrado) {
            throw new Error(`Error léxico: carácter no reconocido en "${codigoFuente.slice(cursor)}"`);
        }
    }

    return tokens;
}

// **Analizador Sintáctico**
function analizarSintaxis(tokens) {
    let cursor = 0;

    function parsePrograma() {
        const declaraciones = [];
        while (cursor < tokens.length && tokens[cursor].valor !== '}') {
            declaraciones.push(parseDeclaracion());
        }
        return { tipo: 'Programa', declaraciones };
    }

    function parseDeclaracion() {
        if (tokens[cursor].tipo === 'PALABRA_CLAVE' && tokens[cursor].valor === 'let') {
            return parseAsignacion();
        }
        if (tokens[cursor].tipo === 'PALABRA_CLAVE' && tokens[cursor].valor === 'if') {
            return parseCondicional();
        }
        if (tokens[cursor].tipo === 'PALABRA_CLAVE' && tokens[cursor].valor === 'while') {
            return parseWhile();
        }
        if (tokens[cursor].tipo === 'PALABRA_CLAVE' && tokens[cursor].valor === 'for') {
            return parseFor();
        }
        if (tokens[cursor].tipo === 'PALABRA_CLAVE' && tokens[cursor].valor === 'class') {
            return parseClass();
        }
        if (tokens[cursor].tipo === 'PALABRA_CLAVE' && tokens[cursor].valor === 'function') {
            return parseFunction();
        }
        // Si no es una palabra clave, asumimos que es una expresión
        const expresion = parseExpresion();
        consumir('DELIMITADOR', ';');
        return { tipo: 'Expresion', expresion };
    }

    function parseAsignacion() {
        consumir('PALABRA_CLAVE', 'let');
        const identificador = consumir('IDENTIFICADOR');
        consumir('OPERADOR', '=');
        const expresion = parseExpresion();
        consumir('DELIMITADOR', ';');
        return { tipo: 'Asignacion', identificador, expresion };
    }

    function parseCondicional() {
        consumir('PALABRA_CLAVE', 'if');
        consumir('DELIMITADOR', '(');
        const condicion = parseExpresion();
        consumir('DELIMITADOR', ')');
        consumir('DELIMITADOR', '{');
        const bloque = parsePrograma();
        consumir('DELIMITADOR', '}');
        let alternativo = null;

        if (cursor < tokens.length && tokens[cursor].tipo === 'PALABRA_CLAVE' && tokens[cursor].valor === 'else') {
            consumir('PALABRA_CLAVE', 'else');
            consumir('DELIMITADOR', '{');
            alternativo = parsePrograma();
            consumir('DELIMITADOR', '}');
        }

        return { tipo: 'Condicional', condicion, bloque, alternativo };
    }

    function parseWhile() {
        consumir('PALABRA_CLAVE', 'while');
        consumir('DELIMITADOR', '(');
        const condicion = parseExpresion();
        consumir('DELIMITADOR', ')');
        consumir('DELIMITADOR', '{');
        const bloque = parsePrograma();
        consumir('DELIMITADOR', '}');
        return { tipo: 'While', condicion, bloque };
    }

    function parseFor() {
        consumir('PALABRA_CLAVE', 'for');
        consumir('DELIMITADOR', '(');
        const inicializacion = parseAsignacion();
        const condicion = parseExpresion();
        consumir('DELIMITADOR', ';');
        const actualizacion = parseExpresion();
        consumir('DELIMITADOR', ')');
        consumir('DELIMITADOR', '{');
        const bloque = parsePrograma();
        consumir('DELIMITADOR', '}');
        return { tipo: 'For', inicializacion, condicion, actualizacion, bloque };
    }

    function parseClass() {
        consumir('PALABRA_CLAVE', 'class');
        const nombreClase = consumir('IDENTIFICADOR');
        consumir('DELIMITADOR', '{');
        const metodos = [];
        while (cursor < tokens.length && tokens[cursor].valor !== '}') {
            metodos.push(parseFunction());
        }
        consumir('DELIMITADOR', '}');
        return { tipo: 'Clase', nombre: nombreClase, metodos };
    }

    function parseFunction() {
        consumir('PALABRA_CLAVE', 'function');
        const nombreFuncion = consumir('IDENTIFICADOR');
        consumir('DELIMITADOR', '(');
        const parametros = [];
        while (cursor < tokens.length && tokens[cursor].valor !== ')') {
            parametros.push(consumir('IDENTIFICADOR'));
            if (tokens[cursor].valor === ',') {
                consumir('DELIMITADOR', ',');
            }
        }
        consumir('DELIMITADOR', ')');
        consumir('DELIMITADOR', '{');
        const cuerpo = parsePrograma();
        consumir('DELIMITADOR', '}');
        return { tipo: 'Funcion', nombre: nombreFuncion, parametros, cuerpo };
    }

    function parseExpresion() {
        let termino = parseTermino();
        while (cursor < tokens.length && tokens[cursor].tipo === 'OPERADOR' && /^[+\-*/><=!]=?$/.test(tokens[cursor].valor)) {
            const operador = consumir('OPERADOR');
            const siguienteTermino = parseTermino();
            termino = { tipo: 'Operacion', operador, izquierdo: termino, derecho: siguienteTermino };
        }
        return termino;
    }

    function parseTermino() {
        if (tokens[cursor].tipo === 'IDENTIFICADOR') {
            return consumir('IDENTIFICADOR');
        }
        if (tokens[cursor].tipo === 'CONSTANTE') {
            return consumir('CONSTANTE');
        }
        throw new Error(`Error de sintaxis: término no válido en "${tokens[cursor].valor}"`);
    }

    function consumir(tipo, valor = null) {
        const token = tokens[cursor];
        if (token.tipo !== tipo || (valor && token.valor !== valor)) {
            throw new Error(`Error de sintaxis: se esperaba "${valor || tipo}" pero se encontró "${token.valor}"`);
        }
        cursor++;
        return token;
    }

    return parsePrograma();
}

// **Vinculación con el DOM**
document.getElementById('codigoFuente').addEventListener('input', () => {
    const codigoFuente = document.getElementById('codigoFuente').value;

    try {
        // Analizar léxicamente
        const tokens = analizarLexico(codigoFuente);
        document.getElementById('salidaTokens').textContent = JSON.stringify(tokens, null, 2);

        // Analizar sintácticamente
        const arbolSintactico = analizarSintaxis(tokens);
        document.getElementById('salidaArbol').textContent = JSON.stringify(arbolSintactico, null, 2);

        // Resaltar el código
        document.getElementById('codigoResaltado').textContent = codigoFuente;
        Prism.highlightElement(document.getElementById('codigoResaltado'));

        // Cambiar el borde del textarea a verde si no hay errores
        document.getElementById('codigoFuente').classList.remove('error');
        document.getElementById('codigoFuente').classList.add('correcto');
    } catch (error) {
        document.getElementById('salidaTokens').textContent = '';
        document.getElementById('salidaArbol').textContent = error.message;

        // Cambiar el borde del textarea a rojo si hay errores
        document.getElementById('codigoFuente').classList.remove('correcto');
        document.getElementById('codigoFuente').classList.add('error');
    }
});

document.getElementById('btnAnalizar').addEventListener('click', () => {
    const codigoFuente = document.getElementById('codigoFuente').value;

    try {
        // Analizar léxicamente
        const tokens = analizarLexico(codigoFuente);
        document.getElementById('salidaTokens').textContent = JSON.stringify(tokens, null, 2);

        // Analizar sintácticamente
        const arbolSintactico = analizarSintaxis(tokens);
        document.getElementById('salidaArbol').textContent = JSON.stringify(arbolSintactico, null, 2);
    } catch (error) {
        document.getElementById('salidaTokens').textContent = '';
        document.getElementById('salidaArbol').textContent = error.message;
    }
});