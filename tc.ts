import { Expr, Stmt, Type } from "./ast";

type FunctionsEnv = Map<string, [Type[], Type]>;
type BodyEnv = Map<string, Type>;

export function tcExpr(e: Expr<any>, functions: FunctionsEnv, variables: BodyEnv): Expr<Type> {
  switch (e.tag) {
    case "number": return { ...e, a: "int" };
    case "true": return { ...e, a: "bool" };
    case "false": return { ...e, a: "bool" };
    case "binop": {
      switch (e.op) {
        case "+": return { ...e, a: "int" };
        case "-": return { ...e, a: "int" };
        case ">": return { ...e, a: "bool" };
        case "and": return { ...e, a: "bool" };
        case "or": return { ...e, a: "bool" };
        default: throw new Error(`Unhandled op ${e.op}`)
      }
    }
    case "id": return { ...e, a: variables.get(e.name) };
    case "call":
      if (e.name === "print") {
        if (e.args.length !== 1) { throw new Error("print expects a single argument"); }
        const newArgs = [tcExpr(e.args[0], functions, variables)];
        const res: Expr<Type> = { ...e, a: "none", args: newArgs };
        return res;
      }
      if (!functions.has(e.name)) {
        throw new Error(`function ${e.name} not found`);
      }

      const [args, ret] = functions.get(e.name);
      if (args.length !== e.args.length) {
        throw new Error(`Expected ${args.length} arguments but got ${e.args.length}`);
      }

      const newArgs = args.map((a, i) => {
        const argtyp = tcExpr(e.args[i], functions, variables);
        if (a !== argtyp.a) { throw new Error(`Got ${argtyp} as argument ${i + 1}, expected ${a}`); }
        return argtyp
      });

      return { ...e, a: ret, args: newArgs };
  }
}

export function tcStmt(s: Stmt<any>, functions: FunctionsEnv, variables: BodyEnv, currentReturn: Type): Stmt<Type> {
  switch (s.tag) {
    case "assign": {
      const rhs = tcExpr(s.value, functions, variables);
      if (variables.has(s.name) && variables.get(s.name) !== rhs.a) {
        throw new Error(`Cannot assign ${rhs} to ${variables.get(s.name)}`);
      }
      else {
        variables.set(s.name, rhs.a);
      }
      return { ...s, value: rhs };
    }
    case "define": {
      const bodyvars = new Map<string, Type>(variables.entries());
      s.params.forEach(p => { bodyvars.set(p.name, p.typ) });
      const newStmts = s.body.map(bs => tcStmt(bs, functions, bodyvars, s.ret));
      return { ...s, body: newStmts };
    }
    case "expr": {
      const ret = tcExpr(s.expr, functions, variables);
      return { ...s, expr: ret };
    }
    case "return": {
      const valTyp = tcExpr(s.value, functions, variables);
      if (valTyp.a !== currentReturn) {
        throw new Error(`${valTyp} returned but ${currentReturn} expected.`);
      }
      return { ...s, value: valTyp };
    }
  }
}

export function tcProgram(p: Stmt<any>[]): Stmt<Type>[] {
  const functions = new Map<string, [Type[], Type]>();
  p.forEach(s => {
    if (s.tag === "define") {
      functions.set(s.name, [s.params.map(p => p.typ), s.ret]);
    }
  });

  const globals = new Map<string, Type>();
  return p.map(s => {
    if (s.tag === "assign") {
      const rhs = tcExpr(s.value, functions, globals);
      globals.set(s.name, rhs.a);
      return { ...s, value: rhs };
    }
    else {
      const res = tcStmt(s, functions, globals, "none");
      return res;
    }
  });
}



// import { Template } from "webpack";
// import { Expr, Stmt, Type, FunDef, Program, TypedVar, VarInit, Literal } from "./ast";
// type TypeEnv = {
//   vars: Map<string, Type>,
//   funs: Map<string, [Type[], Type]>,
//   retType: Type
// }

// export function typeCheckProgram(prog: Program<null>): Program<Type> {
//   const typeEnv: TypeEnv = { vars: prog.varinits, funs: fundefs }

//   typedFun = typeCheckFunDef(prog.fundefs, typeEnv)
//   typedStmts = typeCheckStmts(prog.stmts, typeEnv)
// }
// export function typeCheckVarInits(inits: VarInit<null>[], env: TypeEnv): VarInit<Type>[] {
//   const typedInits: VarInit<Type>[] = [];
//   inits.forEach((init) => {
//     const typedInit = typeCheckLiteral(init.init)
//     if (typedInit.a != init.type) {
//       throw new Error("TYPE ERROR: init type does not match literal type");
//     }
//     env.vars.set(init.name, init.type);
//     typedInits.push({ ...init, a: init.type, init: typedInit })
//   })

//   return typedInits;

// }
// export function typeCheckExpr(expr: Expr<null>, env: TypeEnv): Expr<Type> {
//   switch (expr.tag) {
//     case "id":
//       if (!env.vars.has(expr.name)) {
//         throw new Error("TYPE ERROR: unbound id");
//       }
//       const idType = env.vars.get(expr.name)
//       break;
//     case "builtin1":
//       break
//     case "builtin2":
//       const arg1 = typeCheckExpr(expr.arg1, env);
//       const arg2 = typeCheckExpr(expr.arg2, env);
//       if (arg1.a !== Type.int) {
//         throw new Error("TYPE ERROR: arg1 must a int");
//       }
//       if (arg2.a !== Type.int) {
//         throw new Error("TYPE ERROR: arg2 must a int");
//       }
//       return { ...expr, arg1, arg2, a: Type.int }
//     case "binop":
//       const left = typeCheckExpr(expr.lhs, env);
//       const right = typeCheckExpr(expr.rhs, env);
//       if (left.a !== Type.int) {
//         throw new Error("TYPE ERROR: left must a int");
//       }
//       if (right.a !== Type.int) {
//         throw new Error("TYPE ERROR: right must a int");
//       }
//       return { ...expr, a: Type.int }
//     case "call":
//       break;
//     case "literal":
//       const lit = typeCheckLiteral(expr.literal)
//       return { ...expr, a: lit.a }
//   }
// }
// export function typeCheckLiteral(literal: Literal<null>): Literal<Type> {
//   switch (literal.tag) {
//     case "num": return { ...literal, a: Type.int }
//     case "bool": return { ...literal, a: Type.bool }
//     case "none": return { ...literal, a: Type.none }
//   }
// }
// export function typeCheckParams(params: TypedVar<null>[]): TypedVar<Type>[] {
//   return params.map(param => {
//     return { ...param, a: param.type }
//   })
// }

// export function typeCheckFunDef(fun: FunDef<null>, env: TypeEnv): FunDef<Type> {
//   const localEnv = duplicateEnv(env)

//   // add params to env
//   fun.params.forEach(param => localEnv.vars.set(param.name, param.type))
//   // check inits
//   const typedParams = typeCheckParams(fun.params)

//   // add inits to env
//   // check inits
//   const typedInits = typeCheckVarInits(fun.inits, env);
//   fun.inits.forEach(init => localEnv.vars.set(init.name, init.type))

//   //add fun type to env
//   localEnv.funs.set(fun.name, [fun.params.map(param => param.type), fun.ret])

//   // add ret type
//   localEnv.retType = fun.ret;
//   // check body
//   const typedStmts = typeCheckStmts(fun.body, localEnv);
//   return { ...fun, params: typedParams, inits: typedInits, body: typedStmts };
//   // make sure every path has the expected return type
// }
// export function typeCheckStmts(stmts: Stmt<null>[], env: TypeEnv): Stmt<Type>[] {
//   const typedStmts: Stmt<Type>[] = [];
//   stmts.forEach(stmt => {
//     switch (stmt.tag) {
//       case "assign":
//         if (!env.vars.get(stmt.name)) {
//           throw new Error("TYPE ERROR: unbound id");
//         }
//         const typedValue = typeCheckExpr(stmt.value, env);
//         if (typedValue.a !== env.vars.get(stmt.name)) {
//           throw new Error("TYPE ERROR: cannot assign value to id");
//         }
//         typedStmts.push({ ...stmt, value: typedValue, a: Type.none })
//         break;
//       case "return":
//         const typedRet = typeCheckExpr(stmt.ret, env);
//         if (typedRet.a != env.retType) {
//           throw new Error("TYPE ERROR: return type mismatch");
//         }
//         typedStmts.push({ ...stmt, ret: typedRet })
//         break;
//       // case "if": 
//       // const typedCond ...
//       // const typedThn 
//       // const typedEls
//       case "pass":
//         typedStmts.push({ ...stmt, a: Type.none })
//         break;
//       case "expr":
//         const typedExpr = typeCheckExpr(stmt.expr, env);
//         typedStmts.push({ ...stmt, expr: typedExpr, a: Type.none })
//         break;
//     }

//   })
//   return typedStmts;
// }
// function duplicateEnv(env: TypeEnv): TypeEnv {
//   return { vars: new Map(env.vars), funs: new Map(env.funs), retType: env.retType }
// }
