// Example of assistant script 
import {UI_Helper, Assistant_Script} from "/modules/assistant.js"

class Calculator extends Assistant_Script{
  constructor(){
    super();
    this.ui = new UI_Helper("The assistant will test the following operations");

    // add custom test for the addition
    this.ui.add_test("Addition", async function () {
      const a = this.randint(0, 1000), b = this.randint(0,1000);
      this.set_init_STDIN(`${a} + ${b}\n\0`);
      if(!this.run_simulator()){
        this.ui.log("No file selected");
        return false;
      }
      await this.sleep(5000);
      console.log(this.stdoutBuffer);
      const result = this.stdoutBuffer.trim();
      this.ui.log(`Test: ${a} + ${b} Expected: ${a + b} Result: ${result}`);
      this.stop_simulator();
      if(result == `${a + b}`){
        return true;
      }else{
        return false;
      }
    }.bind(this));

    // add simple equality test for the subtraction and multiplication
    const a = this.randint(0, 1000), b = this.randint(0,1000);
    this.ui.add_test("Subtraction", this.simple_equality_test(`${a} - ${b}\n\0`, a-b));
    this.ui.add_test("Multiplication", this.simple_equality_test(`${a} * ${b}\n\0`, a*b));
  }

  randint(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

}

new Calculator();