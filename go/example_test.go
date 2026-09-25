package notjwt_test

import (
	"fmt"

	notjwt "github.com/rafiibrahim8/not-jwt/go"
)

func Example() {
	signer, err := notjwt.New("super-secret-key")
	if err != nil {
		panic(err)
	}

	token := signer.Sign("hello")
	message, err := signer.Verify(token)
	if err != nil {
		panic(err)
	}

	fmt.Println(message)
	// Output: hello
}
