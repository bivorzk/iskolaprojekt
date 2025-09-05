const bcrypt = require('bcrypt');

const salt = 10;

const userPassword = 'user_password';
bcrypt.hash(userPassword, salt, (err, hash) => {
    if (err) {
        return;
    }

console.log('Hashed password:', hash);

});
hash = '$2b$10$pnrafxAO5SwEFy4xuWZWquINrQEd70s6XIxI.oxXIPxfrKw3vtI9a'

bcrypt.compare(userPassword,hash, (err, result) => {
    if (err) {
        return;
    }

if (result){
    console.log('mukodik');
}else{
    console.log('nem mukodik')
}

})