(function (homeController) {
    
    var bodyParser = require('body-parser');

    homeController.init = function (app) {       

        app.get("/", function (req, res) {            
            res.render("layout", {});
        });

        app.get("/test", function (req, res) {
                        
            if(req.query && req.query.expr)
                var exprVal = req.query.expr;
                      
            var m = new ExpressionEvaluator();
            m.evaluate({ 'expr' :  exprVal});
            res.render("index", { myExpr: m.result.expr });
        });
        
        app.get("/test/:expr", function (req, res) {                        
                        
            if (req.params && req.params.expr)
                var exprVal = req.params.expr;
            
            var m = new ExpressionEvaluator();
            m.evaluate({ 'expr' : exprVal });
            res.render("index", { myExpr: m.result.expr });
        });        
    };

    function ExpressionEvaluator() {
        
        // Variable Declaration(s)
        this.operatorWeights = {
            '(': -1, 
            ')': -1, 
            '+': 0, 
            '-': 0, 
            '/': 1, 
            '*': 1, 
            '^': 2
        };
        
        // Parentheses Count    
        var leftParenthesesCnt = 0;
        var rightParenthesesCnt = 0;

        // Stores final result
        this.result = {};
        
        // Stack to hold operators
        var stackOperators = [];
        
        // Stack to hold operands
        var stackOperands = [];
        
        // Main method - entry point
        this.evaluate = function (input) {
            for (var i in input) {
                var variablename = null;
                var expr = null;
                
                if (!variablename) {
                    
                    // Expression "key" received in the request
                    variablename = i;
                    
                    // Expression "value" received in the request
                    expr = input[variablename];
                    
                    // Tokenize the expression "value"
                    var arr = this.tokenize(expr);
                    
                    // Do a parantheses check
                    this.checkParantheses(arr);

                    var result = this.processTokens(arr, this.result);
                    
                    this.result[variablename] = result;
                    
                    variablename = null;
                    expr = null;
                    }
            }
            
            if (stackOperators.length != 0) {                               
                throw new Error('Expression is not valid');
            }
            return this.result;
        }
        
        
        this.checkParantheses = function (tokens) {
            var leftCnt = 0;
            var rightCnt = 0;

            for (var i = 0; i < tokens.length; i++) {
                if (tokens[i] == '(')
                    leftCnt++;
                if (tokens[i] == ')')
                    rightCnt++;
            }

            if (leftCnt > rightCnt)
                throw new Error('Additional left parantheses encountered');

            if (rightCnt > leftCnt)
                throw new Error('Additional right parantheses encountered');
        }

        // Tokenizes the input string
        this.tokenize = function (str) {
            
            // Replace all occurrences of single space, tabs, line feed etc with a single space
            str = str.replace(/\s/g, '');
            
            // Surround all operators with "#" in the input expression
            for (var i in this.operatorWeights) {
                var regex = new RegExp("\\" + i, "g");
                str = str.replace(regex, '#' + i + '#');
            }
            
            // Now split the string with "#" delimters in order to receive tokens
            return str.split('#');
        }
        
        this.compareOperations = function (curr, prev) {
            
            var currValue = this.operatorWeights[curr];            
            var prevValue = this.operatorWeights[prev];
            
            // Implies that the previous operation should be processed before moving ahead
            if (currValue < prevValue)
                return -1;
            
            // Implies that the current operation has more weight than the previous operation and hence we can continue to stack
            if (currValue > prevValue)
                return 1;
            
            // Implies that the current operation has same weight as the previous operation and hence we can continue to stack
            return 0;
        }
        
        // Computes the sub expresion value. 
        // When a endingChar is provided, stop processing prior to it and pop the ending char. This is only true for scenario (a) listed below 
        // Invoked when
        //      a. ")" is encountered 
        //      b. When two operators are evaluated and prev operator weight > curr operator weight
        //      c. Cleanup
        this.computeExpression = function (endingChar) {
            
            if (stackOperators.length > 0) {
                while (stackOperators.length > 0 && stackOperators[stackOperators.length - 1] != '(') {
                    
                    var op = stackOperators.pop();
                    var right = stackOperands.pop();
                    var left = stackOperands.pop();
                    
                    if (op != null && (right == null || left == null)) {
                        throw new Error("Invalid operator encountered");
                    }
                                                            
                    switch (op) {
                        case '+':
                            stackOperands.push(left + right);
                            break;
                        case '-':
                            stackOperands.push(left - right);
                            break;
                        case '/':
                            stackOperands.push(left / right);
                            break;
                        case '*':
                            stackOperands.push(left * right);
                            break;
                        case '^':
                            stackOperands.push(Math.pow(left, right));
                            break;                       
                        default:
                            throw new Error('This operator is not handled: ' + op);
                    }
                }
            }
            else {
                if (endingChar) {                    
                    throw new Error('Additional token encountered: ' + endingChar);
                }
            }
            if (endingChar && stackOperators[stackOperators.length - 1] == '(') {                
                stackOperators.pop();
            }
        }
        
        // Tries to convert every token to float, if successful, the token is identified as an operand, else its an operator
        // All operators pushed to stackOperators
        // All o pusheperandsd to stackOperands
        this.processTokens = function (arr, result) {
                     
            for (var i = 0; i < arr.length; i++) {
                                
                var a = arr[i];
                
                if (a == '')
                    continue;
                
                if (result[a]) {
                    a = result[a];
                }
                                
                var parsed = parseFloat(a);
                
                if (isNaN(parsed)) {
                    
                    if (a == ')') {
                        rightParenthesesCnt++;
                        this.computeExpression(a);
                        continue;
                    }

                    if (stackOperators.length == 0 || a == '(') {
                        leftParenthesesCnt++;                      
                        stackOperators.push(a);
                        continue;
                    }
                                                          
                    var prev = stackOperators[stackOperators.length - 1];                    
                    var comp = this.compareOperations(a, prev);
                    
                    if (comp < 0) {
                        this.computeExpression();
                    }
                    
                    stackOperators.push(a);
                }
                else {
                    stackOperands.push(parsed);
                }
            }
            
            this.computeExpression();
            
            // Final result will be available on top of operand stack. If not, there is an error with the expression
            if (stackOperands.length != 1) throw new Error('Invalid expression');
            
            return stackOperands.pop();
        }                
    };
})(module.exports);